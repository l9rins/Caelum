// ═══════════════════════════════════════════════════════════
//  CAELUM — NBA 2K14 .ROS Flat Engine  v7
//  Verified against Leftos nba-2k13-roster-editor + RED MC Enums.txt
//  Validated: LeBron C2C at slot 121, Durant Posterizer at slot 291
// ═══════════════════════════════════════════════════════════

// ── Constants ────────────────────────────────────────────────
export const FLAT = 0x253F0;  // first player record byte offset
export const SZ = 1024;     // bytes per slot
export const N = 1664;     // total player slots
export const SOFF = 548;      // ratings start  (FirstSS + 14)
export const SN = 43;       // rating count
export const TOFF = 591;      // tendencies start (FirstSS + 57)
export const TN = 69;       // tendency byte count (57 mapped + 12 internal)
export const HZOFF = 660;      // hot spots start
export const HZCOUNT = 14;       // hot zones (2-bit packed)
export const SIG_OFF = 534;      // signature skills base byte (= FirstSS)

// Signature skill layout within SIG_OFF (verified via LeBron C2C + Durant Posterizer):
//   Bit  0– 5 : skill 1  (6 bits)
//   Bit  6–11 : skill 2  (6 bits)
//   Bit 12–25 : SKIP     (14 bits — from 2K13 PlayerReader.cs ReadSignatureSkills)
//   Bit 26–31 : skill 3  (6 bits)
//   Bit 32–37 : skill 4  (6 bits)
//   Bit 38–43 : skill 5  (6 bits)
//   Total: 44 bits = 6 bytes consumed (bytes SIG_OFF … SIG_OFF+5)

// Name resolution
export const NAME_TBL = 0x1C53F0;
export const COMBO_SIZE = 40;
export const NAME_POOL = 0x25ED40;
export const NRI_BIT = 4441;    // bit offset of the 12-bit NRI within a slot
export const NRI_WIDTH = 12;

// ── CRC32 (IEEE 802.3, poly 0xEDB88320) ─────────────────────
const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[i] = c;
    }
    return t;
})();

function crc32raw(buf: Uint8Array, start: number, end: number): number {
    let c = 0xffffffff;
    for (let i = start; i < end; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff];
    return (c ^ 0xffffffff) >>> 0;
}

function bswap32(v: number): number {
    return (
        ((v & 0xff) << 24) |
        (((v >> 8) & 0xff) << 16) |
        (((v >> 16) & 0xff) << 8) |
        ((v >>> 24) & 0xff)
    ) >>> 0;
}

export function fixCRC(buf: Uint8Array): void {
    const dv = new DataView(buf.buffer, buf.byteOffset);
    dv.setUint32(0, bswap32(crc32raw(buf, 4, buf.length)), true);
}

export function validateCRC(buf: Uint8Array): boolean {
    const stored = new DataView(buf.buffer, buf.byteOffset).getUint32(0, true);
    return stored === bswap32(crc32raw(buf, 4, buf.length));
}

// ── Stat codec ───────────────────────────────────────────────
// Binary byte → display value:  floor(b / 3) + 25  → [25 … 110]
// Display value → binary byte:  (v - 25) * 3        → [0 … 255]
// v6 BUG FIXED: cap was 222 (≈ OVR 99), now 255 (full range, allows 110-rated modded slots)
export const decodeStat = (b: number): number => Math.floor(b / 3) + 25;
export const encodeStat = (v: number): number => Math.max(0, Math.min(255, Math.round((v - 25) * 3)));

// ── Tendency codec ────────────────────────────────────────────
// Game stores raw 0–99 for user-facing tendencies (indices 0–56).
// Indices 57–68 are engine-internal and can contain any byte value;
// they are preserved on all writes and never re-encoded.
export const decodeTend = (b: number): number => b;               // display raw
export const encodeTend = (v: number): number => Math.max(0, Math.min(99, Math.round(v)));   // user write: clamp 0–99
export const encodeTendRaw = (v: number): number => v & 0xff;      // preserve internal bytes

// ── Bit helpers (MSB-first) ───────────────────────────────────
function readBitsMsb(buf: Uint8Array, bitOffset: number, count: number): number {
    let result = 0;
    for (let i = 0; i < count; i++) {
        const byteIdx = Math.floor((bitOffset + i) / 8);
        const bitPos = 7 - ((bitOffset + i) % 8);
        result = (result << 1) | ((buf[byteIdx] >> bitPos) & 1);
    }
    return result;
}

function writeBitsMsb(buf: Uint8Array, bitOffset: number, count: number, value: number): void {
    for (let i = 0; i < count; i++) {
        const byteIdx = Math.floor((bitOffset + i) / 8);
        const bitPos = 7 - ((bitOffset + i) % 8);
        if ((value >> (count - 1 - i)) & 1) {
            buf[byteIdx] |= (1 << bitPos);
        } else {
            buf[byteIdx] &= ~(1 << bitPos);
        }
    }
}

// ── Signature Skills ──────────────────────────────────────────
// Layout: 6b–6b–skip14b–6b–6b–6b across bytes SIG_OFF … SIG_OFF+5
// Validated: LeBron slot 121 → [Corner Spec, None, None, LeBron C2C, None]
//            Durant slot 291 → [None,         None, None, Posterizer, One Man FB]
const SIG_BIT_OFFSETS = [0, 6, 26, 32, 38] as const;

export function readSigSkills(buf: Uint8Array, slot: number): number[] {
    const base = (FLAT + slot * SZ + SIG_OFF) * 8;
    return SIG_BIT_OFFSETS.map(off => readBitsMsb(buf, base + off, 6));
}

export function writeSigSkills(buf: Uint8Array, slot: number, skills: number[]): void {
    const base = (FLAT + slot * SZ + SIG_OFF) * 8;
    SIG_BIT_OFFSETS.forEach((off, i) => {
        writeBitsMsb(buf, base + off, 6, (skills[i] ?? 0) & 0x3f);
    });
    fixCRC(buf);
}

// ── Hot Zone codec (2-bit packed: 0=Cold 1=Neutral 2=Hot 3=Burned) ──
export function readHotZones(buf: Uint8Array, slot: number): number[] {
    const base = FLAT + slot * SZ + HZOFF;
    return Array.from({ length: HZCOUNT }, (_, i) => {
        const byteIdx = base + Math.floor((i * 2) / 8);
        const bitOfs = (i * 2) % 8;
        return (buf[byteIdx] >> (6 - bitOfs)) & 0x03;
    });
}

export function writeHotZone(buf: Uint8Array, slot: number, index: number, value: number): void {
    const base = FLAT + slot * SZ + HZOFF;
    const byteIdx = base + Math.floor((index * 2) / 8);
    const shift = 6 - (index * 2) % 8;
    buf[byteIdx] = (buf[byteIdx] & ~(0x03 << shift)) | ((value & 0x03) << shift);
    fixCRC(buf);
}

// ── Name Resolution ───────────────────────────────────────────
export function buildNamePool(buf: Uint8Array): string[] {
    const names: string[] = [""]; // index 0 = empty
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let pos = NAME_POOL;
    while (pos + 1 < buf.length) {
        const chars: number[] = [];
        while (pos + 1 < buf.length) {
            const ch = view.getUint16(pos, true); // UTF-16LE
            pos += 2;
            if (ch === 0) break;
            chars.push(ch);
        }
        // Stop if we've clearly overrun the pool (hit binary garbage)
        if (chars.length === 0) continue;
        names.push(String.fromCharCode(...chars));
    }
    return names;
}

export function readPlayerName(
    buf: Uint8Array,
    slot: number,
    pool: string[]
): { first: string; last: string } {
    const base = FLAT + slot * SZ;
    const nri = readBitsMsb(buf, base * 8 + NRI_BIT, NRI_WIDTH);
    if (nri === 0 || nri === 0xfff) return { first: "", last: "" };

    const comboBase = NAME_TBL + nri * COMBO_SIZE;
    if (comboBase + 18 >= buf.length) return { first: "", last: "" };

    // Combo table stores name pool indices as single bytes at offsets +16 (last) +17 (first).
    // NOTE: pool has up to ~910 entries; if indices exceed 255 this will need uint16 reads.
    const lastId = buf[comboBase + 16];
    const firstId = buf[comboBase + 17];

    return {
        first: (firstId > 0 && firstId < pool.length) ? pool[firstId] : "",
        last: (lastId > 0 && lastId < pool.length) ? pool[lastId] : "",
    };
}

// ── Core Read / Write ─────────────────────────────────────────
export interface SlotData {
    slot: number;
    stats: number[];   // 43 decoded values [25–110]
    tends: number[];   // 69 raw bytes
    hotZones: number[];   // 14 values (0–3)
    sigSkills: number[];   // 5 values (0–40/44)
    ovr: number;     // decoded stats[0]
}

export function readSlot(buf: Uint8Array, slot: number): SlotData | null {
    if (slot < 0 || slot >= N) return null;
    const base = FLAT + slot * SZ;
    if (base + SZ > buf.length) return null;

    return {
        slot,
        stats: Array.from({ length: SN }, (_, i) => decodeStat(buf[base + SOFF + i])),
        tends: Array.from({ length: TN }, (_, i) => buf[base + TOFF + i]),
        hotZones: readHotZones(buf, slot),
        sigSkills: readSigSkills(buf, slot),
        ovr: decodeStat(buf[base + SOFF]),
    };
}

export function writeStat(buf: Uint8Array, slot: number, index: number, value: number): void {
    if (slot < 0 || slot >= N || index < 0 || index >= SN) return;
    buf[FLAT + slot * SZ + SOFF + index] = encodeStat(value);
    fixCRC(buf);
}

// User-facing tendency write (clamps 0–99, refuses internal indices 57–68)
export function writeTend(buf: Uint8Array, slot: number, index: number, value: number): void {
    if (slot < 0 || slot >= N || index < 0 || index >= 57) return; // 57–68 are engine-internal
    buf[FLAT + slot * SZ + TOFF + index] = encodeTend(value);
    fixCRC(buf);
}

// Raw tendency write (0–255, any index — for engine-internal bytes or low-level tools)
export function writeTendRaw(buf: Uint8Array, slot: number, index: number, value: number): void {
    if (slot < 0 || slot >= N || index < 0 || index >= TN) return;
    buf[FLAT + slot * SZ + TOFF + index] = value & 0xff;
    fixCRC(buf);
}

// ── CSV Types & Parser ────────────────────────────────────────
export interface CSVRow {
    fn: string;
    ln: string;
    team: number;
    pos: number;
    jersey: number;
    stats: number[];   // 43 values (index 0 = Overall_I, intentionally skipped on write)
    tends: number[];   // 57 mapped values (indices 57–68 are internal, preserved on write)
    hotZones: number[];   // 14 values
    sigSkills: number[];   // 5 values
}

// ── CSV column → binary index mappings ───────────────────────
// Verified against Players.csv header + Leftos Rating.cs enum.
// 13 index bugs fixed in v3, all confirmed in v6/v7.
// Index 0 (Overall_I) is "always 1 in ROS files" (RED MC doc) — never written to binary.
const STAT_CSV_COLS: string[] = [
    "Overall_I",  // [0] — intentionally skipped in applyAllFromCSV
    "SShtLoP", "SShtCls", "SShtFT", "SStdDunk",
    "SLayUp", "SLayUpSpin", "SSht3PT", "SShtMed", "SDunk",
    "SSpeed", "SQuick", "SStrength", "SBlock", "SSteal",
    "SShtInT", "SLayUpEuro", "SLayUpHop", "SRunner", "SStpThru",
    "SLayUpStnd", "SPstFdaway", "SPstHook", "SShtOfD", "SBallHndl",
    "SOffHDrib", "SBallSec", "SPass", "SOReb", "SDReb",
    "SOLowPost", "SDLowPost", "SOAwar", "SDAwar", "SConsis",
    "SStamina", "SHands", "SOnBallD", "SEmotion", "SVertical",
    "SHustle", "SDurab", "SPOT",
];

// 57 CSV-mapped tendencies (binary indices 0–56).
// Binary indices 57–68 are engine-internal — NOT in CSV, NOT overwritten.
const TEND_CSV_COLS: string[] = [
    "TShtTend", "TInsShots", "TCloseSht", "TMidShots", "T3PTShots",
    "TPutbacks", "TDriveLn", "TPullUp", "TPumpFake", "TTrplThrt",
    "TNoTT", "TTTShot", "TSizeUp", "THesitat", "TStrghtDr",
    "TCrossov", "TSpin", "TStepBack", "THalfSpin", "TDblCross",
    "TBhndBack", "THesCross", "TInAndOut", "TDPSimpDr", "TAttackB",
    "TPassOut", "TFadeaway", "TStpbJmpr", "TSpinJmpr", "TDunkvLU",
    "TAlleyOop", "TUseGlass", "TDrawFoul", "TVShCrash", "TPckRlvFd",
    "TPostUp", "TTouches", "TPostSpn", "TPostDrv", "TPostAgBd",
    "TLeavePost", "TPostDrpSt", "TPostFaceU", "TPostBDown", "TPostShots",
    "TPostHook", "TPostFdawy", "TPostShmSh", "TPostHopSh", "TFlshPass",
    "TThrowAO", "THardFoul", "TTakeChrg", "TPassLane", "TOnBalStl",
    "TContShot", "TCommFoul",
];

const HZ_CSV_COLS: string[] = [
    "HZ1", "HZ2", "HZ3", "HZ4", "HZ5", "HZ6", "HZ7",
    "HZ8", "HZ9", "HZ10", "HZ11", "HZ12", "HZ13", "HZ14",
];

export function parseCSV(text: string): Record<number, CSVRow> {
    const lines = text.replace(/\r/g, "").split("\n").filter(l => l.trim());
    if (lines.length < 2) return {};

    const sep = lines[0].includes("\t") ? "\t" : ",";
    const hdr = lines[0].split(sep).map(h => h.replace(/"/g, "").trim());
    const colIdx: Record<string, number> = {};
    hdr.forEach((h, i) => (colIdx[h] = i));

    // Integer getter — returns 0 for missing/invalid columns
    const getInt = (cols: string[], key: string, min = 0, max = 99): number => {
        const ci = colIdx[key];
        if (ci === undefined) return 0;
        const v = parseInt(cols[ci]?.replace(/"/g, "") || "0", 10);
        return isNaN(v) ? 0 : Math.max(min, Math.min(max, v));
    };
    const getStr = (cols: string[], key: string): string =>
        (cols[colIdx[key]] ?? "").replace(/"/g, "").trim();

    const db: Record<number, CSVRow> = {};
    lines.slice(1).forEach((line, idx) => {
        const cols = line.split(sep);
        db[idx] = {
            fn: getStr(cols, "First_Name"),
            ln: getStr(cols, "Last_Name"),
            team: parseInt(cols[colIdx["TeamID1"]] || "-1", 10),
            pos: getInt(cols, "Pos", 0, 4),
            jersey: getInt(cols, "Number", 0, 99),
            stats: STAT_CSV_COLS.map(c => getInt(cols, c)),
            tends: TEND_CSV_COLS.map(c => getInt(cols, c, 0, 99)),
            hotZones: HZ_CSV_COLS.map(c => getInt(cols, c, 0, 3)),
            sigSkills: [1, 2, 3, 4, 5].map(n => getInt(cols, `SigSkill${n}`, 0, 44)), // NOTE: Max 44
        };
    });

    return db;
}

// ── Apply Single CSV Row → Binary Slot ───────────────────────
// IMPORTANT: index 0 (Overall_I) is always "1" in CSV (RED MC doc).
//            Writing it would set OVR byte to encodeStat(1) = 0 → decoded 25. SKIP IT.
//            Internal tendency bytes 57–68 are PRESERVED (not zeroed).
export function applyAllFromCSV(buf: Uint8Array, slot: number, row: CSVRow): void {
    if (slot < 0 || slot >= N) return;
    const base = FLAT + slot * SZ;

    // Stats: skip index 0 (Overall_I)
    for (let i = 1; i < SN; i++) {
        buf[base + SOFF + i] = encodeStat(row.stats[i] ?? 0);
    }

    // Tendencies: write only mapped indices 0–56; leave 57–68 untouched
    for (let i = 0; i < 57; i++) {
        buf[base + TOFF + i] = encodeTend(row.tends[i] ?? 0);
    }
    // indices 57–68: no-op — existing bytes preserved

    // Hot zones (2-bit packed)
    for (let i = 0; i < HZCOUNT; i++) {
        const byteIdx = base + HZOFF + Math.floor((i * 2) / 8);
        const shift = 6 - (i * 2) % 8;
        buf[byteIdx] = (buf[byteIdx] & ~(0x03 << shift)) | ((row.hotZones[i] & 0x03) << shift);
    }

    // Signature skills
    writeSigSkills(buf, slot, row.sigSkills);  // also calls fixCRC

    fixCRC(buf);
}

// ── Bulk: Apply Entire CSV to All Slots ───────────────────────
// Writes all rows where slot index < N in a single pass, one final CRC fix.
export function applyCSVBulk(
    buf: Uint8Array,
    db: Record<number, CSVRow>,
    onProgress?: (slot: number) => void
): number {
    let written = 0;
    for (let slot = 0; slot < N; slot++) {
        const row = db[slot];
        if (!row) continue;

        const base = FLAT + slot * SZ;
        if (base + SZ > buf.length) continue;

        // Stats (skip index 0)
        for (let i = 1; i < SN; i++) buf[base + SOFF + i] = encodeStat(row.stats[i] ?? 0);

        // Tendencies 0–56 only
        for (let i = 0; i < 57; i++) buf[base + TOFF + i] = encodeTend(row.tends[i] ?? 0);

        // Hot zones
        for (let i = 0; i < HZCOUNT; i++) {
            const byteIdx = base + HZOFF + Math.floor((i * 2) / 8);
            const shift = 6 - (i * 2) % 8;
            buf[byteIdx] = (buf[byteIdx] & ~(0x03 << shift)) | ((row.hotZones[i] & 0x03) << shift);
        }

        // Sig skills (bit write, no CRC flush yet)
        const sigBase = (base + SIG_OFF) * 8;
        SIG_BIT_OFFSETS.forEach((off, i) => {
            writeBitsMsb(buf, sigBase + off, 6, (row.sigSkills[i] ?? 0) & 0x3f);
        });

        written++;
        onProgress?.(slot);
    }

    fixCRC(buf); // single CRC fix for the entire bulk pass
    return written;
}

// ── Label Arrays ─────────────────────────────────────────────

// 43 ratings in binary index order
export const STAT_LABELS: string[] = [
    "Overall", "Low Post", "Close Shot", "Free Throw", "Std Dunk",
    "Layup", "Spin Layup", "3-Point", "Mid-Range", "Dunk",
    "Speed", "Quickness", "Strength", "Block", "Steal",
    "In Traffic", "Euro Layup", "Hop Layup", "Runner", "Step-Thru",
    "Std Layup", "Post Fade", "Post Hook", "Shot Off Drib", "Ball Handle",
    "Off-Hand Drib", "Ball Security", "Passing", "Off Rebound", "Def Rebound",
    "Off Low Post", "Def Low Post", "Off Awareness", "Def Awareness", "Consistency",
    "Stamina", "Hands", "On-Ball Def", "Intangibles", "Vertical",
    "Hustle", "Durability", "Potential",
];

// 69 tendency labels (57 mapped + 12 engine-internal)
export const TEND_LABELS: string[] = [
    "Shot", "Inside", "Close", "Mid-Range", "3PT",
    "Putback", "Drive Lane", "Pull-Up", "Pump Fake", "Triple Threat",
    "No TT", "TT Shot", "Size Up", "Hesitation", "Straight Drive",
    "Crossover", "Spin", "Step Back", "Half Spin", "Double Cross",
    "Behind Back", "Hesi Cross", "In & Out", "Simple Drive", "Attack Basket",
    "Pass Out", "Fadeaway", "Stepback J", "Spin Jumper", "Dunk vs Layup",
    "Alley-Oop", "Use Glass", "Draw Foul", "Crash Board", "PnR Fade",
    "Post Up", "Touches", "Post Spin", "Post Drive", "Post vs Big",
    "Leave Post", "Drop Step", "Face Up", "Back Down", "Post Shots",
    "Post Hook", "Post Fadeaway", "Shimmy Shot", "Hop Shot", "Flashy Pass",
    "AO Throw", "Hard Foul", "Take Charge", "Pass Lane", "On-Ball Steal",
    "Contest Shot", "Commit Foul",
    // Engine-internal (57–68) — values preserved on write, never encoded from CSV
    "Help Defense", "Fight Rebound", "High-Low", "Std Dunk Int", "Mid-Game",
    "Self Alley-Oop", "Guard Post", "Transition", "Off Screen", "Isolation",
    "PnR Handler", "PnR Roll Man",
];

export const HZ_LABELS: string[] = [
    "HZ1", "HZ2", "HZ3", "HZ4", "HZ5", "HZ6", "HZ7",
    "HZ8", "HZ9", "HZ10", "HZ11", "HZ12", "HZ13", "HZ14",
];

export const HZ_ZONE_NAMES: string[] = [
    "Restricted Area", "In The Lane", "Low Post Left", "Low Post Right",
    "Mid-Range Left", "Mid-Range Center", "Mid-Range Right",
    "Above Break Left", "Above Break Center", "Above Break Right",
    "Corner 3 Left", "Corner 3 Right", "Deep 3 Left", "Deep 3 Right",
];

export const HZ_VALUES = ["Cold", "Neutral", "Hot", "Burned"] as const;
export type HotZoneValue = typeof HZ_VALUES[number];

// Signature skills — 2K14 order from RED MC Enums.txt
export const SIG_SKILLS: string[] = [
    "None", "Posterizer", "Highlight Film", "Finisher", "Acrobat",
    "Catch and Shoot", "Shot Creator", "Deadeye", "Corner Specialist", "Screen Outlet",
    "Post Proficiency", "Ankle Breaker", "Pick & Roll Maestro", "One Man Fastbreak", "Post Playmaker",
    "Dimer", "Break Starter", "Alley-Ooper", "Flashy Passer", "Brick Wall",
    "Hustle Points", "Lockdown Defender", "Charge Card", "Interceptor", "Pick Pocket",
    "Active Hands", "Pick Dodger", "Eraser", "Chasedown Artist", "Floor General",
    "Defensive Anchor", "Bruiser", "Scrapper", "Tenacious Rebounder", "Anti-Freeze",
    "Microwave", "Heat Retention", "Closer", "Gatorade Perform Pack", "On Court Coach",
    "LeBron Coast to Coast",
    // 41–44: unused stubs (documented in RED MC but not assigned to players)
    "Assist Bonus", "Off Awareness Bonus", "Def Awareness Bonus", "Attribute Penalty",
];

// Stat groupings for PlayerView tabs — by binary index
export const STAT_GROUPS: { name: string; color: string; indices: number[] }[] = [
    { name: "Core", color: "#f97316", indices: [0, 34, 35, 38] },
    { name: "Finishing", color: "#ec4899", indices: [4, 9, 5, 6, 16, 17, 18, 19, 20, 21, 22] },
    { name: "Shooting", color: "#8b5cf6", indices: [1, 2, 3, 7, 8, 15] },
    { name: "Playmaking", color: "#38bdf8", indices: [23, 24, 25, 26, 27] },
    { name: "Defense", color: "#06b6d4", indices: [13, 14, 37, 30, 31, 36, 33, 32] },
    { name: "Rebounding", color: "#10b981", indices: [28, 29] },
    { name: "Athletic", color: "#4ade80", indices: [10, 11, 12, 39, 40, 41] },
    { name: "Other", color: "#f59e0b", indices: [42, 35] },
];

export const TEAMS: string[] = [
    "76ers", "Bucks", "Bulls", "Cavaliers", "Celtics", "Clippers", "Grizzlies", "Hawks",
    "Heat", "Hornets", "Jazz", "Kings", "Knicks", "Lakers", "Magic", "Mavericks",
    "Nets", "Nuggets", "Pacers", "Pistons", "Raptors", "Rockets", "Spurs", "Suns",
    "Thunder", "Timberwolves", "Trail Blazers", "Warriors", "Wizards", "FA",
];

export const POSITIONS: string[] = ["PG", "SG", "SF", "PF", "C"];

// ── Embedded Player DB ────────────────────────────────────────
// [slot, firstName, lastName, teamIdx, posIdx, jersey]
// These reflect the CLEAN default 2013-14 roster slot assignments.
// The Default_Roster.ROS shipped with RED MC is heavily modded — use Players.csv for validation.
export type EmbeddedPlayer = [number, string, string, number, number, number];

export const EMBEDDED_PLAYERS: EmbeddedPlayer[] = [
    [0, "Michael", "Carter-Williams", 0, 0, 1], [1, "Jason", "Richardson", 0, 1, 23],
    [2, "Evan", "Turner", 0, 2, 12], [3, "Thaddeus", "Young", 0, 3, 21],
    [4, "Nerlens", "Noel", 0, 4, 4], [5, "Spencer", "Hawes", 0, 1, 0],
    [9, "Lavoy", "Allen", 0, 4, 50], [10, "Kwame", "Brown", 0, 4, 0],
    [22, "O.J.", "Mayo", 1, 1, 10], [23, "Brandon", "Knight", 1, 0, 11],
    [24, "Ersan", "Ilyasova", 1, 3, 7], [25, "Larry", "Sanders", 1, 4, 8],
    [26, "John", "Henson", 1, 4, 31], [27, "Zaza", "Pachulia", 1, 4, 27],
    [28, "Luke", "Ridnour", 1, 0, 14], [29, "Gary", "Neal", 1, 1, 14],
    [30, "Giannis", "Antetokounmpo", 1, 3, 34], [31, "Khris", "Middleton", 1, 2, 22],
    [40, "Derrick", "Rose", 2, 0, 1], [41, "Jimmy", "Butler", 2, 2, 21],
    [42, "Luol", "Deng", 2, 3, 9], [43, "Carlos", "Boozer", 2, 4, 5],
    [44, "Joakim", "Noah", 2, 4, 13], [45, "Kirk", "Hinrich", 2, 0, 12],
    [46, "Taj", "Gibson", 2, 4, 22], [47, "Mike", "Dunleavy", 2, 3, 34],
    [52, "Kyrie", "Irving", 3, 0, 2], [53, "Dion", "Waiters", 3, 1, 3],
    [55, "Tristan", "Thompson", 3, 4, 13], [56, "Andrew", "Bynum", 3, 4, 17],
    [57, "Anthony", "Bennett", 3, 4, 15], [58, "Jarrett", "Jack", 3, 0, 1],
    [60, "Matthew", "Dellavedova", 3, 0, 8], [61, "Tyler", "Zeller", 3, 4, 40],
    [65, "Rajon", "Rondo", 4, 0, 9], [66, "Paul", "Pierce", 4, 3, 34],
    [67, "Kevin", "Garnett", 4, 4, 5], [68, "Brandon", "Bass", 4, 4, 30],
    [69, "Avery", "Bradley", 4, 1, 0], [70, "Jeff", "Green", 4, 3, 8],
    [71, "Jared", "Sullinger", 4, 4, 7], [72, "Jordan", "Crawford", 4, 1, 15],
    [73, "Courtney", "Lee", 4, 2, 11], [74, "Kelly", "Olynyk", 4, 4, 41],
    [78, "Chris", "Paul", 5, 0, 3], [79, "Jamal", "Crawford", 5, 1, 11],
    [80, "Matt", "Barnes", 5, 3, 22], [81, "Blake", "Griffin", 5, 4, 32],
    [82, "DeAndre", "Jordan", 5, 4, 6], [83, "J.J.", "Redick", 5, 1, 4],
    [84, "Jared", "Dudley", 5, 3, 10], [85, "Darren", "Collison", 5, 0, 2],
    [93, "Mike", "Conley", 6, 0, 11], [94, "Tayshaun", "Prince", 6, 2, 22],
    [95, "Zach", "Randolph", 6, 4, 50], [96, "Marc", "Gasol", 6, 4, 33],
    [97, "Tony", "Allen", 6, 2, 9], [98, "Quincy", "Pondexter", 6, 2, 0],
    [99, "Jerryd", "Bayless", 6, 0, 7], [100, "Ed", "Davis", 6, 4, 32],
    [104, "Al", "Horford", 7, 4, 15], [105, "Paul", "Millsap", 7, 4, 4],
    [106, "Kyle", "Korver", 7, 2, 26], [107, "Jeff", "Teague", 7, 0, 0],
    [108, "Lou", "Williams", 7, 1, 6], [109, "Josh", "Smith", 7, 3, 5],
    [119, "Mario", "Chalmers", 8, 0, 6], [120, "Dwyane", "Wade", 8, 1, 3],
    [121, "LeBron", "James", 8, 2, 6], [122, "Udonis", "Haslem", 8, 4, 40],
    [123, "Chris", "Bosh", 8, 4, 1], [124, "Ray", "Allen", 8, 1, 34],
    [125, "Shane", "Battier", 8, 2, 31], [126, "Norris", "Cole", 8, 0, 30],
    [127, "Chris", "Andersen", 8, 4, 11], [128, "Joel", "Anthony", 8, 4, 50],
    [129, "Rashard", "Lewis", 8, 3, 9], [130, "Greg", "Oden", 8, 4, 0],
    [133, "Trey", "Burke", 9, 0, 3], [134, "Alec", "Burks", 9, 1, 10],
    [135, "Gordon", "Hayward", 9, 3, 20], [136, "Paul", "Millsap", 9, 4, 24],
    [137, "Al", "Jefferson", 9, 4, 25], [138, "Randy", "Foye", 9, 1, 14],
    [139, "Marvin", "Williams", 9, 3, 2],
    [152, "DeMarcus", "Cousins", 10, 4, 15], [153, "Marcus", "Thornton", 10, 2, 23],
    [155, "Isaiah", "Thomas", 10, 0, 21], [156, "Rudy", "Gay", 10, 3, 8],
    [157, "Ben", "McLemore", 10, 2, 16],
    [160, "Carmelo", "Anthony", 11, 3, 7], [161, "Raymond", "Felton", 11, 0, 2],
    [162, "Tyson", "Chandler", 11, 4, 6], [163, "Tim", "Hardaway Jr.", 11, 2, 5],
    [164, "J.R.", "Smith", 11, 2, 8], [165, "Amar'e", "Stoudemire", 11, 4, 1],
    [167, "Metta", "World Peace", 11, 3, 15],
    [173, "Kobe", "Bryant", 12, 1, 24], [174, "Pau", "Gasol", 12, 4, 16],
    [175, "Steve", "Nash", 12, 0, 10], [176, "Dwight", "Howard", 12, 4, 12],
    [177, "Steve", "Blake", 12, 0, 5], [178, "Jordan", "Hill", 12, 4, 27],
    [179, "Nick", "Young", 12, 2, 0], [181, "Jodie", "Meeks", 12, 2, 20],
    [186, "Victor", "Oladipo", 13, 1, 5], [187, "Jameer", "Nelson", 13, 0, 14],
    [188, "Nikola", "Vucevic", 13, 4, 9], [190, "Arron", "Afflalo", 13, 2, 4],
    [195, "Monta", "Ellis", 14, 1, 11], [196, "Dirk", "Nowitzki", 14, 4, 41],
    [197, "Jose", "Calderon", 14, 0, 8], [198, "Vince", "Carter", 14, 2, 25],
    [199, "Shawn", "Marion", 14, 3, 0], [202, "O.J.", "Mayo", 14, 1, 32],
    [208, "Deron", "Williams", 15, 0, 8], [209, "Brook", "Lopez", 15, 4, 11],
    [210, "Joe", "Johnson", 15, 2, 7], [211, "Kevin", "Garnett", 15, 4, 2],
    [212, "Paul", "Pierce", 15, 3, 34], [213, "Andrei", "Kirilenko", 15, 3, 47],
    [214, "Jason", "Terry", 15, 1, 31],
    [219, "Ty", "Lawson", 16, 0, 3], [220, "Danilo", "Gallinari", 16, 3, 8],
    [221, "Wilson", "Chandler", 16, 3, 21], [222, "Kenneth", "Faried", 16, 4, 35],
    [224, "Nate", "Robinson", 16, 0, 10], [225, "Andre", "Iguodala", 16, 2, 9],
    [229, "Paul", "George", 17, 2, 24], [230, "George", "Hill", 17, 0, 3],
    [231, "Roy", "Hibbert", 17, 4, 55], [232, "David", "West", 17, 4, 21],
    [233, "Lance", "Stephenson", 17, 2, 1], [234, "Danny", "Granger", 17, 3, 33],
    [240, "Brandon", "Jennings", 18, 0, 7], [241, "Greg", "Monroe", 18, 4, 10],
    [242, "Josh", "Smith", 18, 3, 6], [243, "Andre", "Drummond", 18, 4, 0],
    [244, "Kyle", "Singler", 18, 2, 5], [245, "Chauncey", "Billups", 18, 0, 1],
    [249, "DeMar", "DeRozan", 19, 1, 10], [250, "Kyle", "Lowry", 19, 0, 7],
    [251, "Rudy", "Gay", 19, 3, 22], [252, "Amir", "Johnson", 19, 4, 5],
    [253, "Jonas", "Valanciunas", 19, 4, 17], [254, "Terrence", "Ross", 19, 2, 31],
    [258, "James", "Harden", 20, 1, 13], [259, "Chandler", "Parsons", 20, 3, 25],
    [260, "Dwight", "Howard", 20, 4, 12], [261, "Jeremy", "Lin", 20, 0, 7],
    [262, "Omer", "Asik", 20, 4, 3], [263, "Patrick", "Beverley", 20, 0, 2],
    [267, "Tony", "Parker", 21, 0, 9], [268, "Tim", "Duncan", 21, 4, 21],
    [269, "Manu", "Ginobili", 21, 2, 20], [270, "Kawhi", "Leonard", 21, 3, 2],
    [271, "Boris", "Diaw", 21, 3, 33], [272, "Danny", "Green", 21, 2, 14],
    [273, "Matt", "Bonner", 21, 4, 15], [274, "Patty", "Mills", 21, 0, 8],
    [275, "Marco", "Belinelli", 21, 2, 18],
    [280, "Goran", "Dragic", 22, 0, 1], [281, "P.J.", "Tucker", 22, 3, 17],
    [282, "Channing", "Frye", 22, 4, 8], [283, "Marcin", "Gortat", 22, 4, 13],
    [284, "Miles", "Plumlee", 22, 4, 22], [285, "Eric", "Bledsoe", 22, 0, 2],
    [286, "Gerald", "Green", 22, 2, 14],
    [291, "Kevin", "Durant", 23, 3, 35], [292, "Russell", "Westbrook", 23, 0, 0],
    [293, "Serge", "Ibaka", 23, 4, 9], [294, "Kevin", "Martin", 23, 2, 23],
    [295, "Thabo", "Sefolosha", 23, 3, 2], [296, "Reggie", "Jackson", 23, 0, 15],
    [297, "Nick", "Collison", 23, 4, 4],
    [302, "Kevin", "Love", 24, 4, 42], [303, "Nikola", "Pekovic", 24, 4, 14],
    [304, "Ricky", "Rubio", 24, 0, 9], [305, "Corey", "Brewer", 24, 2, 13],
    [313, "LaMarcus", "Aldridge", 25, 4, 12], [314, "Damian", "Lillard", 25, 0, 0],
    [315, "Wesley", "Matthews", 25, 2, 2], [316, "Nicolas", "Batum", 25, 3, 88],
    [317, "Robin", "Lopez", 25, 4, 42], [318, "Mo", "Williams", 25, 0, 25],
    [324, "Stephen", "Curry", 26, 0, 30], [325, "Klay", "Thompson", 26, 1, 11],
    [326, "David", "Lee", 26, 4, 10], [327, "Draymond", "Green", 26, 4, 23],
    [328, "Andrew", "Bogut", 26, 4, 12], [329, "Andre", "Iguodala", 26, 3, 9],
    [330, "Jarrett", "Jack", 26, 0, 1],
    [335, "John", "Wall", 27, 0, 2], [336, "Bradley", "Beal", 27, 1, 3],
    [337, "Nene", "Hilario", 27, 4, 42], [338, "Martell", "Webster", 27, 2, 9],
    [339, "Trevor", "Ariza", 27, 3, 1], [340, "Emeka", "Okafor", 27, 4, 50],
];

// Fast slot → player info lookup
export interface EmbeddedInfo {
    slot: number; fn: string; ln: string; team: number; pos: number; jersey: number;
}
export const EMBEDDED_MAP: Record<number, EmbeddedInfo> = Object.fromEntries(
    EMBEDDED_PLAYERS.map(([s, fn, ln, t, p, j]) => [s, { slot: s, fn, ln, team: t, pos: p, jersey: j }])
);
