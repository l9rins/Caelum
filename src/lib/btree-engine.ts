// ═══════════════════════════════════════════════════════════
//  CAELUM — NBA 2K14 .ROS B-Tree Engine  v2.1
//  Ground-truth architecture. Zero compromise.
// ═══════════════════════════════════════════════════════════

export const BTREE_START = 0x009eb4;
export const BTREE_END = 0x0c2f74;

// ── Forensic Offsets ────────────────────────────────────────
export const ATTRIBUTES_TABLE_OFFSET = 0x253f0;
export const ATTRIBUTES_STRIDE = 1024;
export const NAMES_TABLE_OFFSET = 0x1c53f0;
export const NAMES_STRIDE = 40;
export const NAME_POOL_OFFSET = 0x25ed40;
export const NAME_RECORD_ID_BIT = 4441;
export const NAME_RECORD_ID_WIDTH = 12;
export const NAME_RECORD_SENTINEL = 4095;
export const PLAYER_COUNT = 1664;

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
    nameMap: Map<number, string>;
    elapsed: string;
}

// ── CRC32 ───────────────────────────────────────────────────
const _crcTable = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[i] = c;
    }
    return t;
})();

export function recalculateCrc32(arr: Uint8Array): void {
    let crc = 0xffffffff;
    for (let i = 4; i < arr.length; i++)
        crc = _crcTable[(crc ^ arr[i]) & 0xff] ^ (crc >>> 8);
    crc = (crc ^ 0xffffffff) >>> 0;
    // 2K14 wants a bswap32 of the CRC written LE at bytes 0-3
    const swapped =
        ((crc & 0xff) << 24) |
        ((crc & 0xff00) << 8) |
        ((crc >> 8) & 0xff00) |
        ((crc >>> 24) & 0xff);
    new DataView(arr.buffer, arr.byteOffset).setUint32(0, swapped, true);
}

// ── Math ─────────────────────────────────────────────────────
export const statToKey = (s: number): number => (127.0 * (s + 69.0)) / 100.0;
export const keyToStat = (k: number): number =>
    Math.round((k * 100.0) / 127.0 - 69.0);

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

export function readBitsMsb(
    arr: Uint8Array,
    bitOffset: number,
    count: number
): number {
    let result = 0;
    for (let i = 0; i < count; i++) {
        const byteIdx = Math.floor((bitOffset + i) / 8);
        const bitPos = 7 - ((bitOffset + i) % 8);
        result = (result << 1) | ((arr[byteIdx] >> bitPos) & 1);
    }
    return result;
}

// ── Formatting ───────────────────────────────────────────────
export function toHex(n: number, pad = 4): string {
    return "0x" + n.toString(16).toUpperCase().padStart(pad, "0");
}

export function floatToHex(f: number): string {
    const dv = new DataView(new ArrayBuffer(4));
    dv.setFloat32(0, f, false);
    return [0, 1, 2, 3]
        .map(i => dv.getUint8(i).toString(16).padStart(2, "0").toUpperCase())
        .join(" ");
}

export function fmtBytes(b: number): string {
    if (b < 1024) return b + "B";
    return (b / 1024).toFixed(0) + "KB";
}

// ── Tree Ranges (37 sub-trees, forensically confirmed) ───────
export const TREE_RANGES: { id: number; s: number; e: number }[] = [
    { id: 0, s: 0x009eb4, e: 0x01297d },
    { id: 1, s: 0x012d0c, e: 0x014d13 },
    { id: 2, s: 0x0150a2, e: 0x01b446 },
    { id: 3, s: 0x01b7d5, e: 0x01db6b },
    { id: 4, s: 0x01defa, e: 0x02429e },
    { id: 5, s: 0x02462d, e: 0x026d52 },
    { id: 6, s: 0x0270e1, e: 0x02b47e },
    { id: 7, s: 0x02b80d, e: 0x030d75 },
    { id: 8, s: 0x031104, e: 0x031104 },
    { id: 9, s: 0x031493, e: 0x0362dd },
    { id: 10, s: 0x03666c, e: 0x03ad98 },
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
    { id: 25, s: 0x05ffe1, e: 0x063c60 },
    { id: 26, s: 0x063fef, e: 0x067c6e },
    { id: 27, s: 0x067ffd, e: 0x06d565 },
    { id: 28, s: 0x06d8f4, e: 0x070e55 },
    { id: 29, s: 0x0711e4, e: 0x071c91 },
    { id: 30, s: 0x072020, e: 0x0a9637 },
    { id: 31, s: 0x0a99c6, e: 0x0ac809 },
    { id: 32, s: 0x0acb98, e: 0x0b2f3c },
    { id: 33, s: 0x0b32cb, e: 0x0ba83a },
    { id: 34, s: 0x0babc9, e: 0x0c2856 },
    { id: 35, s: 0x0c2be5, e: 0x0c2be5 },
    { id: 36, s: 0x0c2f74, e: 0x0c2f74 },
];

// ── Tree Labels ──────────────────────────────────────────────
//
//  CONFIRMED via multi-player forensic analysis on Original.ROS:
//    T04 → Pass          (LeBron B-Tree = 97)
//    T07 → Speed         (LeBron B-Tree = 93)
//    T09 → Driving Dunk  (LeBron B-Tree = 95)
//    T10 → Ball Handle   (LeBron B-Tree = 93, Kobe = 85 ✓)
//    T25 → Overall       (LeBron B-Tree = 99)
//    T26 → Vertical      (LeBron B-Tree = 85)
//    T30 → Stamina       (246-player cluster in 70s range)
//
//  All remaining trees are pending a second-pass analysis on
//  the ORIGINAL (unedited) roster file with tree_mapper.py.
//
export const TREE_LABELS: Record<number, string> = {
    // ── Confirmed ─────────────────────────────────────────────
    4: "Pass",
    7: "Speed",
    9: "Driving Dunk",
    10: "Ball Handle",
    25: "Overall",
    26: "Vertical",
    30: "Stamina",

    // ── Pending confirmation ───────────────────────────────────
    0: "Unknown Attribute",
    1: "Unknown Attribute",
    2: "Unknown Attribute",
    3: "Unknown Attribute",
    5: "Unknown Attribute",
    6: "Unknown Attribute",
    8: "Unknown Attribute",
    11: "Unknown Attribute",
    12: "Unknown Attribute",
    13: "Unknown Attribute",
    14: "Unknown Attribute",
    15: "Unknown Attribute",
    16: "Unknown Attribute",
    17: "Unknown Attribute",
    18: "Unknown Attribute",
    19: "Unknown Attribute",
    20: "Unknown Attribute",
    21: "Unknown Attribute",
    22: "Unknown Attribute",
    23: "Unknown Attribute",
    24: "Unknown Attribute",
    27: "Unknown Attribute",
    28: "Unknown Attribute",
    29: "Unknown Attribute",
    31: "Unknown Attribute",
    32: "Unknown Attribute",
    33: "Unknown Attribute",
    34: "Unknown Attribute",
    35: "Unknown Attribute",
    36: "Unknown Attribute",
};

// ── Label helper ─────────────────────────────────────────────
export function treeLabel(id: number): string {
    return TREE_LABELS[id] ?? `Unknown [T${id}]`;
}

export function getTreeId(offset: number): number {
    for (const t of TREE_RANGES) {
        if (offset >= t.s && offset <= t.e) return t.id;
    }
    return -1;
}

// ── Name Resolution ──────────────────────────────────────────
function buildNamePool(arr: Uint8Array): string[] {
    const names: string[] = [""]; // 1-indexed
    let pos = NAME_POOL_OFFSET;
    while (names.length < 1500 && pos + 1 < arr.length) {
        const chars: string[] = [];
        while (pos + 1 < arr.length) {
            const ch = arr[pos] | (arr[pos + 1] << 8);
            pos += 2;
            if (ch === 0) break;
            if (ch >= 32 && ch < 127) chars.push(String.fromCharCode(ch));
        }
        names.push(chars.join(""));
    }
    return names;
}

export function buildCfidMap(arr: Uint8Array): Map<number, number> {
    const map = new Map<number, number>();
    for (let idx = 0; idx < PLAYER_COUNT; idx++) {
        const recBase = ATTRIBUTES_TABLE_OFFSET + idx * ATTRIBUTES_STRIDE;
        const cfid = readBitsMsb(arr, recBase * 8 + 70, 10);
        if (cfid > 0) map.set(cfid, idx);
    }
    return map;
}

export function resolvePlayerName(
    arr: Uint8Array,
    flatIdx: number,
    namePool: string[]
): string | null {
    const recOffset = ATTRIBUTES_TABLE_OFFSET + flatIdx * ATTRIBUTES_STRIDE;
    const nri = readBitsMsb(
        arr,
        recOffset * 8 + NAME_RECORD_ID_BIT,
        NAME_RECORD_ID_WIDTH
    );
    if (nri === 0 || nri === NAME_RECORD_SENTINEL) return null;

    const comboOffset = NAMES_TABLE_OFFSET + nri * NAMES_STRIDE;
    if (comboOffset + 18 >= arr.length) return null;

    const lastId = arr[comboOffset + 16];
    const firstId = arr[comboOffset + 17];

    const first =
        firstId > 0 && firstId < namePool.length ? namePool[firstId] : "";
    const last =
        lastId > 0 && lastId < namePool.length ? namePool[lastId] : "";
    const full = `${first} ${last}`.trim();
    return full || null;
}

// ── Known Players (hardcoded fallback) ───────────────────────
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
    const nameMap = new Map<number, string>();
    const end = Math.min(BTREE_END + 1, arr.length - 12);
    const t0 = performance.now();

    // 1. Build name resolution structures
    const namePool = buildNamePool(arr);
    const cfidMap = buildCfidMap(arr);

    // 2. Scan B-Tree region
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
        i += 11; // skip ahead past confirmed node
    }

    // 3. Resolve names for every discovered PID
    for (const pid of map.keys()) {
        // Try flat-table name resolution first
        const flatIdx = cfidMap.get(pid);
        if (flatIdx !== undefined) {
            const resolved = resolvePlayerName(arr, flatIdx, namePool);
            if (resolved) { nameMap.set(pid, resolved); continue; }
        }
        // Fall back to hardcoded list
        const known = KNOWN_PLAYERS[pid];
        if (known) nameMap.set(pid, known.name);
    }

    const elapsed = (performance.now() - t0).toFixed(1);
    return { map, nameMap, elapsed };
}

// ── Patcher ──────────────────────────────────────────────────
//  Clones the original buffer, writes new floats, recalculates CRC32.
export function applyPatches(
    originalBuf: ArrayBuffer,
    edits: Map<number, Map<string, Edit>>
): { patched: ArrayBuffer; count: number } {
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

    // Recompute CRC32 so the game accepts the file
    recalculateCrc32(arr);

    return { patched, count };
}

// ── Stat helpers ─────────────────────────────────────────────
export type StatTier = "elite" | "great" | "good" | "avg" | "poor";

export function getStatTier(stat: number): StatTier {
    if (stat >= 95) return "elite";
    if (stat >= 85) return "great";
    if (stat >= 75) return "good";
    if (stat >= 60) return "avg";
    return "poor";
}

export function getPlayerName(
    pid: number,
    nameMap?: Map<number, string>
): string {
    return nameMap?.get(pid) ?? KNOWN_PLAYERS[pid]?.name ?? `Player ${toHex(pid)}`;
}

export function getPlayerInitials(
    pid: number,
    nameMap?: Map<number, string>
): string {
    const name = getPlayerName(pid, nameMap);
    if (!name.startsWith("Player 0x")) {
        return name
            .split(" ")
            .map(w => w[0])
            .join("")
            .slice(0, 2);
    }
    return pid.toString(16).toUpperCase().slice(-2);
}

export function getPlayerOvr(
    nodes: BTreeNode[],
    pidEdits?: Map<string, Edit>
): number {
    // T25 = Overall
    const ovrNode = nodes.find(n => n.treeId === 25);
    if (ovrNode) {
        const edit = pidEdits?.get(String(ovrNode.offset));
        return edit ? edit.newStat : ovrNode.stat;
    }
    return Math.max(...nodes.map(n => n.stat));
}
