import {
    createContext,
    useContext,
    useReducer,
    useCallback,
    type ReactNode,
} from "react";
import type { BTreeNode, Edit } from "./btree-engine";
import {
    scanBTree,
    applyPatches,
    KNOWN_PLAYERS,
    getPlayerName,
} from "./btree-engine";

// ── State ────────────────────────────────────────────────────
export interface FileInfo {
    name: string;
    size: number;
    nodeCount: number;
    scanTime: string;
    playerCount: number;
}

export interface AppState {
    originalBuf: ArrayBuffer | null;
    playerMap: Map<number, BTreeNode[]>;
    nameMap: Map<number, string>;
    sortedPids: number[];
    edits: Map<number, Map<string, Edit>>;
    selectedPid: number | null;
    fileInfo: FileInfo | null;
    isLoading: boolean;
    loadingMsg: string;
}

const initialState: AppState = {
    originalBuf: null,
    playerMap: new Map(),
    nameMap: new Map(),
    sortedPids: [],
    edits: new Map(),
    selectedPid: null,
    fileInfo: null,
    isLoading: false,
    loadingMsg: "",
};

// ── Actions ──────────────────────────────────────────────────
type Action =
    | { type: "SET_LOADING"; msg: string }
    | { type: "CLEAR_LOADING" }
    | {
        type: "FILE_LOADED";
        buf: ArrayBuffer;
        map: Map<number, BTreeNode[]>;
        nameMap: Map<number, string>;
        sortedPids: number[];
        fileInfo: FileInfo;
    }
    | { type: "SELECT_PLAYER"; pid: number }
    | {
        type: "SET_STAT";
        pid: number;
        offset: number;
        oldStat: number;
        newStat: number;
    }
    | { type: "RESET_PLAYER"; pid: number }
    | { type: "RESET_ALL" };

function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case "SET_LOADING":
            return { ...state, isLoading: true, loadingMsg: action.msg };
        case "CLEAR_LOADING":
            return { ...state, isLoading: false, loadingMsg: "" };
        case "FILE_LOADED":
            return {
                ...state,
                originalBuf: action.buf,
                playerMap: action.map,
                nameMap: action.nameMap,
                sortedPids: action.sortedPids,
                edits: new Map(),
                selectedPid: null,
                fileInfo: action.fileInfo,
                isLoading: false,
                loadingMsg: "",
            };
        case "SELECT_PLAYER":
            return { ...state, selectedPid: action.pid };
        case "SET_STAT": {
            const newEdits = new Map(state.edits);
            const key = String(action.offset);
            if (!newEdits.has(action.pid)) newEdits.set(action.pid, new Map());
            const pm = new Map(newEdits.get(action.pid)!);

            if (action.newStat === action.oldStat) {
                pm.delete(key);
            } else {
                pm.set(key, {
                    offset: action.offset,
                    oldStat: action.oldStat,
                    newStat: action.newStat,
                });
            }
            if (pm.size === 0) {
                newEdits.delete(action.pid);
            } else {
                newEdits.set(action.pid, pm);
            }
            return { ...state, edits: newEdits };
        }
        case "RESET_PLAYER": {
            const newEdits = new Map(state.edits);
            newEdits.delete(action.pid);
            return { ...state, edits: newEdits };
        }
        case "RESET_ALL":
            return { ...state, edits: new Map() };
        default:
            return state;
    }
}

// ── Context ──────────────────────────────────────────────────
interface StoreContextValue {
    state: AppState;
    loadFile: (file: File) => Promise<void>;
    selectPlayer: (pid: number) => void;
    setStat: (pid: number, offset: number, oldStat: number, newStat: number) => void;
    resetPlayer: (pid: number) => void;
    resetAll: () => void;
    downloadPatched: () => number | undefined;
    totalEdits: number;
    editedPlayerCount: number;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState);

    const loadFile = useCallback(async (file: File) => {
        dispatch({ type: "SET_LOADING", msg: "Reading file…" });
        await new Promise((r) => setTimeout(r, 32));

        const buf = await file.arrayBuffer();

        dispatch({ type: "SET_LOADING", msg: "Scanning B-Tree…" });
        await new Promise((r) => setTimeout(r, 32));

        const { map, nameMap, elapsed } = scanBTree(buf);

        // Sort: named players first (resolved or known), then by PID
        const sortedPids = Array.from(map.keys()).sort((a, b) => {
            const aName = nameMap.has(a) || !!KNOWN_PLAYERS[a];
            const bName = nameMap.has(b) || !!KNOWN_PLAYERS[b];
            if (aName && !bName) return -1;
            if (!aName && bName) return 1;
            // Alphabetical by resolved name
            const an = getPlayerName(a, nameMap);
            const bn = getPlayerName(b, nameMap);
            return an.localeCompare(bn);
        });

        const totalNodes = [...map.values()].reduce((s, n) => s + n.length, 0);

        dispatch({
            type: "FILE_LOADED",
            buf,
            map,
            nameMap,
            sortedPids,
            fileInfo: {
                name: file.name,
                size: file.size,
                nodeCount: totalNodes,
                scanTime: elapsed,
                playerCount: map.size,
            },
        });
    }, []);

    const selectPlayer = useCallback((pid: number) => {
        dispatch({ type: "SELECT_PLAYER", pid });
    }, []);

    const setStat = useCallback(
        (pid: number, offset: number, oldStat: number, newStat: number) => {
            const clamped = Math.max(25, Math.min(99, Math.round(isNaN(newStat) ? 25 : newStat)));
            dispatch({ type: "SET_STAT", pid, offset, oldStat, newStat: clamped });
        },
        []
    );

    const resetPlayer = useCallback((pid: number) => {
        dispatch({ type: "RESET_PLAYER", pid });
    }, []);

    const resetAll = useCallback(() => {
        dispatch({ type: "RESET_ALL" });
    }, []);

    // ANTIPATTERN GUARD: originalBuf is never mutated.
    // applyPatches() clones it, writes patched floats, recalculates CRC32, returns blob.
    const downloadPatched = useCallback((): number | undefined => {
        if (!state.originalBuf) return undefined;
        const { patched, count } = applyPatches(state.originalBuf, state.edits);
        const blob = new Blob([patched], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "NBA_Year_2013-14_CAELUM.ROS";
        a.click();
        URL.revokeObjectURL(url);
        return count;
    }, [state.originalBuf, state.edits]);

    const totalEdits = [...state.edits.values()].reduce((s, m) => s + m.size, 0);
    const editedPlayerCount = [...state.edits.values()].filter((m) => m.size > 0).length;

    return (
        <StoreContext.Provider
            value={{
                state,
                loadFile,
                selectPlayer,
                setStat,
                resetPlayer,
                resetAll,
                downloadPatched,
                totalEdits,
                editedPlayerCount,
            }}
        >
            {children}
        </StoreContext.Provider>
    );
}

export function useStore(): StoreContextValue {
    const ctx = useContext(StoreContext);
    if (!ctx) throw new Error("useStore must be inside StoreProvider");
    return ctx;
}
