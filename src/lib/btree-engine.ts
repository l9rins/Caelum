// ═══════════════════════════════════════════════════════════
//  CAELUM — NBA 2K14 .ROS B-Tree Engine  (v2)
//  Ground-truth architecture. Zero compromise.
//
//  Forensic offsets verified against NBA_Year_2013-14.ROS
//  File size: 2,672,672 bytes | CRC32: 0x8DA6BBA4
// ═══════════════════════════════════════════════════════════

// ── B-Tree region ───────────────────────────────────────────
export const BTREE_START = 0x009eb4;
export const BTREE_END = 0x0c2f74;

// ── Player attribute table ──────────────────────────────────
// 1664 players × 1024 bytes each, MSB-first bit-packed.
export const ATTRIBUTES_TABLE_OFFSET = 0x253f0;
export const ATTRIBUTES_STRIDE = 1024;
export const PLAYER_COUNT = 1664;

// ── Name combination table ──────────────────────────────────
// 3235 records × 40 bytes each.
// Each record: byte+16 = last_name_pool_id, byte+17 = first_name_pool_id
export const NAMES_TABLE_OFFSET = 0x1c53f0;
export const NAMES_STRIDE = 40;
export const NAMES_TABLE_COUNT = 3235;
export const NAME_LAST_OFFSET = 16;
export const NAME_FIRST_OFFSET = 17;
export const NAME_RECORD_ID_BIT = 4441; // bit offset in attribute record (12-bit, MSB-first)
export const NAME_RECORD_SENTINEL = 4095; // 0xFFF — no name

// ── Global name pool ────────────────────────────────────────
// UTF-16LE null-terminated strings, 1-indexed, ~699 entries
export const NAME_POOL_OFFSET = 0x25ed40;

// ── Team table ──────────────────────────────────────────────
export const TEAM_TABLE_OFFSET = 0x1c8fc6;
export const TEAM_COUNT = 30;
export const TEAM_RECORD_SIZE = 40;

// ── Types ────────────────────────────────────────────────────
export interface BTreeNode {
    offset: number;
    treeId: number;
    stat: number;
    fval: number;
}

export interface Edit {
    offset: number;
    oldStat: number;
    newStat: number;
}

export interface PlayerInfo {
    name: string;
    pos: string;
    team: string;
}

export interface ScanResult {
    map: Map<number, BTreeNode[]>;
    elapsed: string;
}

export interface PatchResult {
    patched: ArrayBuffer;
    count: number;
}

// ── Math ────────────────────────────────────────────────────
export const statToKey = (s: number): number => (127.0 * (s + 69.0)) / 100.0;
export const keyToStat = (k: number): number =>
    Math.round((k * 100.0) / 127.0 - 69.0);

// ── Big-Endian float I/O ────────────────────────────────────
export function readBeFloat(arr: Uint8Array, i: number): number {
    const bits =
        (arr[i] << 24) | (arr[i + 1] << 16) | (arr[i + 2] << 8) | arr[i + 3];
    const dv = new DataView(new ArrayBuffer(4));
    dv.setInt32(0, bits, false);
    return dv.getFloat32(0, false);
}

export function writeBeFloat(arr: Uint8Array, i: number, val: number): void {
    const dv = new DataView(new ArrayBuffer(4));
    dv.setFloat32(0, val, false);
    arr[i] = dv.getUint8(0);
    arr[i + 1] = dv.getUint8(1);
    arr[i + 2] = dv.getUint8(2);
    arr[i + 3] = dv.getUint8(3);
}

// ── Formatting ──────────────────────────────────────────────
export function toHex(n: number, pad = 4): string {
    return "0x" + n.toString(16).toUpperCase().padStart(pad, "0");
}

export function floatToHex(f: number): string {
    const dv = new DataView(new ArrayBuffer(4));
    dv.setFloat32(0, f, false);
    return [0, 1, 2, 3]
        .map((i) => dv.getUint8(i).toString(16).padStart(2, "0").toUpperCase())
        .join(" ");
}

export function fmtBytes(b: number): string {
    if (b < 1024) return b + "B";
    return (b / 1024).toFixed(0) + "KB";
}

// ── CRC32 ───────────────────────────────────────────────────
// Protocol (from RosterEditor.cpp::save_and_recalculate_checksum):
//   1. CRC32 over bytes [4..end] (skip the first 4 bytes which store the CRC)
//   2. Byte-swap the result (bswap32)
//   3. Write swapped value into bytes [0..3] as Little-Endian uint32
//
// This MUST be called after patching — the game validates the checksum on load.

function buildCrc32Table(): Uint32Array {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[i] = c;
    }
    return table;
}

const CRC32_TABLE = buildCrc32Table();

function crc32(data: Uint8Array, start = 0): number {
    let crc = 0xffffffff;
    for (let i = start; i < data.length; i++) {
        crc = CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function bswap32(n: number): number {
    return (
        ((n & 0xff) << 24) |
        (((n >>> 8) & 0xff) << 16) |
        (((n >>> 16) & 0xff) << 8) |
        ((n >>> 24) & 0xff)
    ) >>> 0;
}

export function recalculateCrc32(arr: Uint8Array): void {
    // 1. CRC32 over payload (bytes 4 → end)
    const raw = crc32(arr, 4);
    // 2. Byte-swap
    const swapped = bswap32(raw);
    // 3. Write into first 4 bytes as LE uint32
    arr[0] = (swapped) & 0xff;
    arr[1] = (swapped >>> 8) & 0xff;
    arr[2] = (swapped >>> 16) & 0xff;
    arr[3] = (swapped >>> 24) & 0xff;
}

// ── Name Resolution ─────────────────────────────────────────
// Reads a player's name from the .ROS binary using the verified offset chain.
//
// Chain (from RosterEditor.hpp):
//   1. attribute_record[bit 4441, 12 bits MSB-first] → Name Record ID (NRI)
//   2. NRI == 0 || NRI == 4095 → no name
//   3. NAMES_TABLE_OFFSET + NRI*40 → 40-byte combination record
//   4. record[+16] = last_name_pool_id (uint8, 1-based)
//      record[+17] = first_name_pool_id (uint8, 1-based)
//   5. NAME_POOL_OFFSET: 1-indexed UTF-16LE null-terminated strings

function readBitsMsb(arr: Uint8Array, bitOffset: number, width: number): number {
    let result = 0;
    for (let b = 0; b < width; b++) {
        const byteIdx = Math.floor((bitOffset + b) / 8);
        const bitIdx = 7 - ((bitOffset + b) % 8); // MSB-first
        if (byteIdx < arr.length) {
            result = (result << 1) | ((arr[byteIdx] >>> bitIdx) & 1);
        }
    }
    return result >>> 0;
}

function readUtf16LeString(arr: Uint8Array, offset: number): string {
    let str = "";
    let i = offset;
    while (i + 1 < arr.length) {
        const ch = arr[i] | (arr[i + 1] << 8);
        if (ch === 0) break;
        str += String.fromCharCode(ch);
        i += 2;
    }
    return str;
}

function resolveNamePoolEntry(arr: Uint8Array, poolId: number): string {
    if (poolId <= 0) return "";
    let offset = NAME_POOL_OFFSET;
    let entry = 0;
    while (offset + 1 < arr.length) {
        entry++;
        const name = readUtf16LeString(arr, offset);
        offset += (name.length + 1) * 2;
        if (entry === poolId) return name;
        if (offset >= arr.length) break;
    }
    return "";
}

export interface ResolvedName {
    first: string;
    last: string;
    full: string;
}

export function resolvePlayerName(arr: Uint8Array, playerIndex: number): ResolvedName {
    const attrOffset = ATTRIBUTES_TABLE_OFFSET + playerIndex * ATTRIBUTES_STRIDE;
    const nri = readBitsMsb(arr, attrOffset * 8 + NAME_RECORD_ID_BIT, 12);
    if (nri === 0 || nri === NAME_RECORD_SENTINEL || nri >= NAMES_TABLE_COUNT) {
        return { first: "", last: "", full: "" };
    }
    const combOffset = NAMES_TABLE_OFFSET + nri * NAMES_STRIDE;
    if (combOffset + NAME_FIRST_OFFSET >= arr.length) return { first: "", last: "", full: "" };
    const lastPoolId = arr[combOffset + NAME_LAST_OFFSET];
    const firstPoolId = arr[combOffset + NAME_FIRST_OFFSET];
    const first = resolveNamePoolEntry(arr, firstPoolId);
    const last = resolveNamePoolEntry(arr, lastPoolId);
    return { first, last, full: [first, last].filter(Boolean).join(" ") };
}

// ── Tree Ranges (forensic analysis — player-uniqueness method) ──
export const TREE_RANGES: { id: number; s: number; e: number }[] = [
    { id: 0, s: 0x009eb4, e: 0x01297d },
    { id: 1, s: 0x012d0c, e: 0x014d13 },
    { id: 2, s: 0x0150a2, e: 0x01b446 },
    { id: 3, s: 0x01b7d5, e: 0x01db6b },
    { id: 4, s: 0x01defa, e: 0x02429e },
    { id: 5, s: 0x02462d, e: 0x026d52 },
    { id: 6, s: 0x0270e1, e: 0x02b47e },
    { id: 7, s: 0x02b80d, e: 0x030d75 }, // Speed / BallHandle (LeBron confirmed)
    { id: 8, s: 0x031104, e: 0x031104 },
    { id: 9, s: 0x031493, e: 0x0362dd }, // Dunk (LeBron=95 confirmed)
    { id: 10, s: 0x03666c, e: 0x03ad98 }, // Low Post (LeBron=93)
    { id: 11, s: 0x03b127, e: 0x03e2f9 },
    { id: 12, s: 0x03e688, e: 0x040300 },
    { id: 13, s: 0x04068f, e: 0x042db4 },
    { id: 14, s: 0x043143, e: 0x04430e },
    { id: 15, s: 0x04469d, e: 0x049f94 },
    { id: 16, s: 0x04a323, e: 0x04b87d },
    { id: 17, s: 0x04bc0c, e: 0x04d166 },
    { id: 18, s: 0x04d4f5, e: 0x04f16d },
    { id: 19, s: 0x04f4fc, e: 0x053c28 },
    { id: 20, s: 0x053fb7, e: 0x054df3 },
    { id: 21, s: 0x055182, e: 0x0566dc },
    { id: 22, s: 0x056a6b, e: 0x05b197 },
    { id: 23, s: 0x05b526, e: 0x05d52d },
    { id: 24, s: 0x05d8bc, e: 0x05fc52 },
    { id: 25, s: 0x05ffe1, e: 0x063c60 }, // Overall / Awareness (LeBron=99)
    { id: 26, s: 0x063fef, e: 0x067c6e }, // Vertical (LeBron=85)
    { id: 27, s: 0x067ffd, e: 0x06d565 },
    { id: 28, s: 0x06d8f4, e: 0x070e55 },
    { id: 29, s: 0x0711e4, e: 0x071c91 },
    { id: 30, s: 0x072020, e: 0x0a9637 }, // Stamina-type (250 nodes ~75)
    { id: 31, s: 0x0a99c6, e: 0x0ac809 },
    { id: 32, s: 0x0acb98, e: 0x0b2f3c },
    { id: 33, s: 0x0b32cb, e: 0x0ba83a },
    { id: 34, s: 0x0babc9, e: 0x0c2856 },
    { id: 35, s: 0x0c2be5, e: 0x0c2be5 },
    { id: 36, s: 0x0c2f74, e: 0x0c2f74 },
];

// Confirmed attribute labels
export const TREE_LABELS: Record<number, string> = {
    7: "Speed / BH",
    9: "Dunk",
    10: "Low Post",
    25: "OVR / AWR",
    26: "Vertical",
    4: "Passing",
    30: "Stamina",
};

export function treeLabel(id: number): string {
    return TREE_LABELS[id] ? `${TREE_LABELS[id]} (T${id})` : `T${id}`;
}

export function getTreeId(offset: number): number {
    for (const t of TREE_RANGES) {
        if (offset >= t.s && offset <= t.e) return t.id;
    }
    return -1;
}

// ── Known Players (hardcoded PIDs, v2 will resolve all via name table) ──────
export const KNOWN_PLAYERS: Record<number, PlayerInfo> = {
    0x0a09: { name: "LeBron James", pos: "SF", team: "MIA" },
    0x0130: { name: "Kevin Durant", pos: "SF", team: "OKC" },
    0x0124: { name: "Kobe Bryant", pos: "SG", team: "LAL" },
    0x0080: { name: "Chris Paul", pos: "PG", team: "LAC" },
    0x0774: { name: "Dwyane Wade", pos: "SG", team: "MIA" },
    0x040e: { name: "Carmelo Anthony", pos: "SF", team: "NYK" },
    0x01aa: { name: "Dirk Nowitzki", pos: "PF", team: "DAL" },
    0x0a50: { name: "Russell Westbrook", pos: "PG", team: "OKC" },
    0x0a3f: { name: "James Harden", pos: "SG", team: "HOU" },
};

// ── B-Tree Scanner ───────────────────────────────────────────
export function scanBTree(buffer: ArrayBuffer): ScanResult {
    const arr = new Uint8Array(buffer);
    const map = new Map<number, BTreeNode[]>();
    const end = Math.min(BTREE_END + 1, arr.length - 12);
    const t0 = performance.now();

    for (let i = BTREE_START; i < end; i++) {
        if (arr[i] !== 0x01 || arr[i + 1] !== 0x30) continue;
        if (arr[i + 4] | arr[i + 5] | arr[i + 6] | arr[i + 7]) continue;
        const pid = (arr[i + 2] << 8) | arr[i + 3];
        if (pid === 0 || pid >= 0x8000) continue;
        const fval = readBeFloat(arr, i + 8);
        const stat = keyToStat(fval);
        if (stat < 1 || stat > 127) continue;
        const treeId = getTreeId(i);
        if (!map.has(pid)) map.set(pid, []);
        map.get(pid)!.push({ offset: i, treeId, stat, fval });
        i += 11;
    }

    const elapsed = (performance.now() - t0).toFixed(1);
    return { map, elapsed };
}

// ── Patcher ──────────────────────────────────────────────────
// ANTIPATTERN GUARDS enforced:
//   ✓ Clone originalBuf — never mutate the source
//   ✓ Only write within B-Tree region
//   ✓ Verify [01 30] node signature before writing
//   ✓ Write exactly 4 bytes at offset+8
//   ✓ Recalculate CRC32 after all patches (game validates on load)
export function applyPatches(
    originalBuf: ArrayBuffer,
    edits: Map<number, Map<string, Edit>>
): PatchResult {
    const patched = originalBuf.slice(0);
    const arr = new Uint8Array(patched);
    let count = 0;

    for (const [, pm] of edits) {
        for (const [, edit] of pm) {
            if (edit.offset < BTREE_START || edit.offset > BTREE_END) continue;
            if (arr[edit.offset] !== 0x01 || arr[edit.offset + 1] !== 0x30) continue;
            writeBeFloat(arr, edit.offset + 8, statToKey(edit.newStat));
            count++;
        }
    }

    // Recalculate CRC32 — REQUIRED for the game to accept the file
    recalculateCrc32(arr);

    return { patched, count };
}

// ── Stat tier ────────────────────────────────────────────────
export type StatTier = "elite" | "great" | "good" | "avg" | "poor";

export function getStatTier(stat: number): StatTier {
    if (stat >= 95) return "elite";
    if (stat >= 85) return "great";
    if (stat >= 75) return "good";
    if (stat >= 60) return "avg";
    return "poor";
}

// ── Player helpers ───────────────────────────────────────────
export function getPlayerName(pid: number): string {
    return KNOWN_PLAYERS[pid]?.name ?? `Player ${toHex(pid)}`;
}

export function getPlayerInitials(pid: number): string {
    const known = KNOWN_PLAYERS[pid];
    if (known) return known.name.split(" ").map((w) => w[0]).join("").slice(0, 2);
    return pid.toString(16).toUpperCase().slice(-2);
}

export function getPlayerOvr(
    nodes: BTreeNode[],
    pidEdits?: Map<string, Edit>
): number {
    const ovrNode = nodes.find((n) => n.treeId === 25);
    if (ovrNode) {
        const edit = pidEdits?.get(String(ovrNode.offset));
        return edit ? edit.newStat : ovrNode.stat;
    }
    return Math.max(...nodes.map((n) => n.stat));
}

// ── Rating IDs (for future flat-record editing — Phase 2) ──
export const RatingID = {
    OVERALL: 0,
    SHOT_LOW_POST: 1,
    SHOT_CLOSE: 2,
    SHOT_MEDIUM: 3,
    SHOT_3PT: 4,
    SHOT_FT: 5,
    DUNK: 6,
    STANDING_DUNK: 7,
    LAYUP: 8,
    STANDING_LAYUP: 9,
    SPIN_LAYUP: 10,
    EURO_LAYUP: 11,
    HOP_LAYUP: 12,
    RUNNER: 13,
    STEP_THROUGH: 14,
    SHOOT_IN_TRAFFIC: 15,
    POST_FADEAWAY: 16,
    POST_HOOK: 17,
    SHOOT_OFF_DRIBBLE: 18,
    BALL_HANDLING: 19,
    OFF_HAND_DRIBBLE: 20,
    BALL_SECURITY: 21,
    PASS: 22,
    BLOCK: 23,
    STEAL: 24,
    HANDS: 25,
    ON_BALL_DEF: 26,
    OFF_REBOUND: 27,
    DEF_REBOUND: 28,
    OFF_LOW_POST: 29,
    DEF_LOW_POST: 30,
    OFF_AWARENESS: 31,
    DEF_AWARENESS: 32,
    CONSISTENCY: 33,
    STAMINA: 34,
    SPEED: 35,
    QUICKNESS: 36,
    STRENGTH: 37,
    VERTICAL: 38,
    HUSTLE: 39,
    DURABILITY: 40,
    POTENTIAL: 41,
    EMOTION: 42,
    COUNT: 43,
} as const;
export type RatingID = typeof RatingID[keyof typeof RatingID];

// Contract salary bit-field locations (from RosterEditor.cpp::get_vital_by_id)
// read_bits_at(byte_offset, bit_offset=0, width=32) relative to player record start
export const CONTRACT_YEAR_OFFSETS: Record<number, number> = {
    1: 222,
    2: 226,
    3: 230,
    4: 234,
    5: 238,
    6: 242,
    7: 246,
};
