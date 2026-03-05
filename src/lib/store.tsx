import { create } from "zustand";
import {
    readSlot,
    writeStat as engineWriteStat,
    writeTend as engineWriteTend,
    writeHotZone as engineWriteHotZone,
    applyAllFromCSV as engineApplyAll,
    fixCRC,
    validateCRC,
    buildNamePool,
    readPlayerName,
    parseCSV,
    decodeStat,
    FLAT,
    SZ,
    SOFF,
    N,
    type SlotData,
    type CSVRow,
    EMBEDDED_MAP,
} from "./flat-engine";

export interface CaelumStore {
    // ── File state ─────────────────────────────────────────
    buf: Uint8Array | null;
    fileName: string;
    csvFileName: string;
    crcOk: boolean | null;
    status: string;

    // ── Parsed data ────────────────────────────────────────
    namePool: string[];
    csvDb: Record<number, CSVRow> | null;
    ovrCache: Record<number, number>;

    // ── Selection ──────────────────────────────────────────
    selectedSlot: number | null;

    // ── Actions ────────────────────────────────────────────
    loadROS: (bytes: Uint8Array, name: string) => void;
    loadCSV: (text: string, name: string) => void;
    selectPlayer: (slot: number | null) => void;
    doWriteStat: (slot: number, index: number, value: number) => void;
    doWriteTend: (slot: number, index: number, value: number) => void;
    doWriteHotZone: (slot: number, index: number, value: number) => void;
    doApplyAllFromCSV: (slot: number) => void;
    doApplyTendsFromCSV: (slot: number) => void;
    doApplyStatsFromCSV: (slot: number) => void;
    exportROS: () => void;

    // ── Helpers ────────────────────────────────────────────
    getSlotData: (slot: number) => SlotData | null;
    getPlayerName: (slot: number) => { first: string; last: string };
}

export const useStore = create<CaelumStore>()((set, get) => ({
    buf: null,
    fileName: "",
    csvFileName: "",
    crcOk: null,
    status: "",
    namePool: [],
    csvDb: null,
    ovrCache: {},
    selectedSlot: null,

    loadROS: (bytes: Uint8Array, name: string) => {
        const buf = new Uint8Array(bytes);
        const pool = buildNamePool(buf);
        const ovrCache: Record<number, number> = {};
        for (let i = 0; i < N; i++) {
            ovrCache[i] = decodeStat(buf[FLAT + i * SZ + SOFF]);
        }
        set({
            buf,
            fileName: name,
            namePool: pool,
            crcOk: validateCRC(buf),
            ovrCache,
            selectedSlot: null,
            status: `Loaded ${name} — search for players by name or slot number`,
        });
    },

    loadCSV: (text: string, name: string) => {
        try {
            const db = parseCSV(text);
            const count = Object.keys(db).length;
            set({
                csvDb: db,
                csvFileName: name,
                status: `CSV loaded — ${count} players. Stats, tendencies, hot zones & sig skills ready.`,
            });
        } catch (err: unknown) {
            set({ status: `CSV error: ${err instanceof Error ? err.message : String(err)}` });
        }
    },

    selectPlayer: (slot: number | null) => set({ selectedSlot: slot }),

    doWriteStat: (slot: number, index: number, value: number) => {
        const { buf } = get();
        if (!buf) return;
        engineWriteStat(buf, slot, index, value);
        set({
            crcOk: true,
            ovrCache: index === 0
                ? { ...get().ovrCache, [slot]: value }
                : get().ovrCache,
            status: `Stat[${index}]=${value} → slot ${slot} ✓`,
        });
    },

    doWriteTend: (slot: number, index: number, value: number) => {
        const { buf } = get();
        if (!buf) return;
        engineWriteTend(buf, slot, index, value);
        set({
            crcOk: true,
            status: `Tend[${index}]=${value} → slot ${slot} ✓`,
        });
    },

    doWriteHotZone: (slot: number, index: number, value: number) => {
        const { buf } = get();
        if (!buf) return;
        engineWriteHotZone(buf, slot, index, value);
        set({
            crcOk: true,
            status: `HotZone[${index}]=${value} → slot ${slot} ✓`,
        });
    },

    doApplyStatsFromCSV: (slot: number) => {
        const { buf, csvDb } = get();
        if (!buf || !csvDb?.[slot]) return;
        const row = csvDb[slot];
        const base = FLAT + slot * SZ;
        row.stats.forEach((v: number, i: number) => {
            if (i < 43) buf[base + SOFF + i] = Math.max(0, Math.min(222, (v - 25) * 3));
        });
        fixCRC(buf);
        set({
            crcOk: true,
            ovrCache: { ...get().ovrCache, [slot]: decodeStat(buf[FLAT + slot * SZ + SOFF]) },
            status: `All CSV stats → slot ${slot} ✓`,
        });
    },

    doApplyTendsFromCSV: (slot: number) => {
        const { buf, csvDb } = get();
        if (!buf || !csvDb?.[slot]) return;
        const row = csvDb[slot];
        const base = FLAT + slot * SZ;
        row.tends.forEach((v: number, i: number) => {
            if (i < 69) buf[base + 591 + i] = Math.max(0, Math.min(99, v));
        });
        fixCRC(buf);
        set({ crcOk: true, status: `All CSV tendencies → slot ${slot} ✓` });
    },

    doApplyAllFromCSV: (slot: number) => {
        const { buf, csvDb } = get();
        if (!buf || !csvDb?.[slot]) return;
        engineApplyAll(buf, slot, csvDb[slot]);
        set({
            crcOk: true,
            ovrCache: { ...get().ovrCache, [slot]: decodeStat(buf[FLAT + slot * SZ + SOFF]) },
            status: `All CSV data → slot ${slot} ✓`,
        });
    },

    exportROS: () => {
        const { buf } = get();
        if (!buf) return;
        fixCRC(buf);
        const blob = new Blob([buf as BlobPart], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "NBA_Year_2013-14.ROS";
        a.click();
        URL.revokeObjectURL(url);
        set({ status: "Exported ✓ CRC updated" });
    },

    getSlotData: (slot: number) => {
        const { buf } = get();
        if (!buf) return null;
        return readSlot(buf, slot);
    },

    getPlayerName: (slot: number) => {
        const { buf, namePool, csvDb } = get();
        if (csvDb?.[slot]) {
            return { first: csvDb[slot].fn, last: csvDb[slot].ln };
        }
        const emb = EMBEDDED_MAP[slot];
        if (emb) {
            return { first: emb.fn, last: emb.ln };
        }
        if (buf && namePool.length > 0) {
            return readPlayerName(buf, slot, namePool);
        }
        return { first: "", last: "" };
    },
}));
