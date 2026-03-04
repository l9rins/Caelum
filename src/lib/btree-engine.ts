// ═══════════════════════════════════════════════════════════
//  CAELUM — NBA 2K14 .ROS B-Tree Engine
//  Ground-truth architecture. Zero compromise.
// ═══════════════════════════════════════════════════════════

export const BTREE_START = 0x009eb4;
export const BTREE_END = 0x0c2f74;

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

// ── Math ────────────────────────────────────────────────────
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

// ── Formatting helpers ──────────────────────────────────────
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

// Tree labels: confirmed = full name, unconfirmed = T{id}
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

// ── Known Players (PID → info) ──────────────────────────────
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
        // Padding check
        if (arr[i + 4] | arr[i + 5] | arr[i + 6] | arr[i + 7]) continue;
        const pid = (arr[i + 2] << 8) | arr[i + 3];
        if (pid === 0 || pid >= 0x8000) continue;
        const fval = readBeFloat(arr, i + 8);
        const stat = keyToStat(fval);
        if (stat < 1 || stat > 127) continue;
        const treeId = getTreeId(i);
        if (!map.has(pid)) map.set(pid, []);
        map.get(pid)!.push({ offset: i, treeId, stat, fval });
        i += 11; // valid node found — skip ahead
    }

    const elapsed = (performance.now() - t0).toFixed(1);
    return { map, elapsed };
}

// ── Patcher ──────────────────────────────────────────────────
// ANTIPATTERN GUARD: Clone originalBuf, apply edits to clone only.
// Write exactly 4 bytes at offset+8 per edit. Nothing else changes.
export function applyPatches(
    originalBuf: ArrayBuffer,
    edits: Map<number, Map<string, Edit>>
): { patched: ArrayBuffer; count: number } {
    const patched = originalBuf.slice(0);
    const arr = new Uint8Array(patched);
    let count = 0;

    for (const [, pm] of edits) {
        for (const [, edit] of pm) {
            // Guard: only write within B-Tree region
            if (edit.offset < BTREE_START || edit.offset > BTREE_END) continue;
            // Verify node signature at offset
            if (arr[edit.offset] !== 0x01 || arr[edit.offset + 1] !== 0x30) continue;
            // Write new float at offset+8 (BE)
            writeBeFloat(arr, edit.offset + 8, statToKey(edit.newStat));
            count++;
        }
    }

    return { patched, count };
}

// ── Stat tier helper ────────────────────────────────────────
export type StatTier = "elite" | "great" | "good" | "avg" | "poor";

export function getStatTier(stat: number): StatTier {
    if (stat >= 95) return "elite";
    if (stat >= 85) return "great";
    if (stat >= 75) return "good";
    if (stat >= 60) return "avg";
    return "poor";
}

export function getPlayerName(pid: number): string {
    return KNOWN_PLAYERS[pid]?.name ?? `Player ${toHex(pid)}`;
}

export function getPlayerInitials(pid: number): string {
    const known = KNOWN_PLAYERS[pid];
    if (known) {
        return known.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2);
    }
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
