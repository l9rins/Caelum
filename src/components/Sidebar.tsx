import { useCallback, useState, useMemo, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStore } from "@/lib/store";
import {
    KNOWN_PLAYERS,
    toHex,
    getPlayerInitials,
    getPlayerOvr,
} from "@/lib/btree-engine";

export function Sidebar() {
    const { state, loadFile, selectPlayer } = useStore();
    const [filter, setFilter] = useState("");
    const [dragging, setDragging] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const loaded = !!state.fileInfo;

    const handleFile = useCallback(
        (file: File) => {
            if (!file.name.toUpperCase().endsWith(".ROS")) return;
            loadFile(file);
        },
        [loadFile]
    );

    const filteredPids = useMemo(() => {
        const q = filter.toLowerCase().trim();
        if (!q) return state.sortedPids;
        return state.sortedPids.filter((pid) => {
            const known = KNOWN_PLAYERS[pid];
            if (known && known.name.toLowerCase().includes(q)) return true;
            if (toHex(pid).toLowerCase().includes(q)) return true;
            if (String(pid).includes(q)) return true;
            return false;
        });
    }, [state.sortedPids, filter]);

    // Keyboard nav
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!filteredPids.length) return;
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA") return;
            const idx = filteredPids.indexOf(state.selectedPid ?? -1);
            if (e.key === "ArrowDown") {
                e.preventDefault();
                if (idx < filteredPids.length - 1)
                    selectPlayer(filteredPids[idx + 1]);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                if (idx > 0) selectPlayer(filteredPids[idx - 1]);
            }
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [filteredPids, state.selectedPid, selectPlayer]);

    return (
        <aside className="bg-deep border-r border-cborder flex flex-col overflow-hidden">
            {/* Drop Zone Section */}
            <div className="border-b border-cborder p-3.5 px-4">
                <div className="font-dmono text-[.58rem] tracking-[.18em] uppercase text-ctext3 mb-2.5">
                    Roster File
                </div>
                <div
                    className={`relative border p-4 text-center cursor-pointer transition-all clip-corner-lg ${loaded
                            ? "border-green2 bg-green2/[0.04]"
                            : dragging
                                ? "border-cyan bg-cyan-dim"
                                : "border-cborder2 bg-surface hover:border-cyan hover:bg-cyan-dim"
                        }`}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragging(false);
                        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
                    }}
                    onClick={() => fileRef.current?.click()}
                >
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".ROS,.ros"
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files?.[0]) handleFile(e.target.files[0]);
                        }}
                    />
                    <div
                        className={`font-bebas text-[1.4rem] tracking-[.1em] mb-1 transition-colors ${loaded ? "text-green2" : dragging ? "text-cyan" : "text-ctext3 group-hover:text-cyan"
                            }`}
                    >
                        {loaded ? "✓ FILE LOADED" : "DROP .ROS FILE"}
                    </div>
                    <div
                        className={`font-dmono text-[.62rem] leading-6 ${loaded ? "text-green2" : "text-ctext3"
                            }`}
                    >
                        {loaded
                            ? `${state.fileInfo!.name} · ${state.fileInfo!.playerCount} players · ${state.fileInfo!.nodeCount} nodes`
                            : "or click to browse · NBA 2K14"}
                    </div>
                </div>
            </div>

            {/* Search Section */}
            <div className="border-b border-cborder p-3.5 px-4">
                <div className="font-dmono text-[.58rem] tracking-[.18em] uppercase text-ctext3 mb-2.5 flex items-center justify-between">
                    Players
                    {state.fileInfo && (
                        <span className="text-cyan">{state.playerMap.size}</span>
                    )}
                </div>
                <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ctext3 text-[.8rem] pointer-events-none">
                        ⌕
                    </span>
                    <Input
                        placeholder="Name or PID…"
                        disabled={!loaded}
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full bg-surface border-cborder pl-8 pr-3 py-2 text-ctext font-dmono text-[.75rem] rounded-none focus:border-cyan placeholder:text-ctext3 disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                </div>
            </div>

            {/* Player List */}
            <ScrollArea className="flex-1">
                <div className="py-1">
                    {filteredPids.length === 0 && (
                        <div className="p-8 text-center font-dmono text-[.7rem] text-ctext3 leading-7">
                            {loaded ? `No players match "${filter}"` : "Load a .ROS file\nto scan the B-Tree"}
                        </div>
                    )}
                    {filteredPids.map((pid) => {
                        const nodes = state.playerMap.get(pid)!;
                        const known = KNOWN_PLAYERS[pid];
                        const name = known?.name ?? `Player ${toHex(pid)}`;
                        const meta = known ? `${known.pos} · ${known.team}` : toHex(pid);
                        const initials = getPlayerInitials(pid);
                        const pidEdits = state.edits.get(pid);
                        const ovr = getPlayerOvr(nodes, pidEdits);
                        const active = pid === state.selectedPid;
                        const hasEdit = pidEdits && pidEdits.size > 0;
                        const ovrCls =
                            ovr >= 95
                                ? "text-amber"
                                : ovr >= 85
                                    ? "text-cyan"
                                    : ovr >= 75
                                        ? "text-green2"
                                        : "text-ctext3";

                        return (
                            <div
                                key={pid}
                                className={`flex items-center gap-2.5 py-2 px-4 cursor-pointer transition-colors border-l-2 relative ${active
                                        ? "bg-cyan-dim border-l-cyan"
                                        : "border-l-transparent hover:bg-surface"
                                    } ${hasEdit ? "player-edited" : ""}`}
                                onClick={() => selectPlayer(pid)}
                            >
                                <div
                                    className={`w-[30px] h-[30px] shrink-0 clip-hex flex items-center justify-center font-bebas text-[.7rem] border border-cborder2 ${active
                                            ? "bg-cyan text-void"
                                            : "bg-lift text-ctext2"
                                        }`}
                                >
                                    {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[.82rem] font-medium text-ctext truncate leading-tight">
                                        {name}
                                    </div>
                                    <div className="font-dmono text-[.6rem] text-ctext3 flex gap-1.5 mt-0.5">
                                        <span>{meta}</span>
                                        <span className="text-cyan2">{nodes.length}n</span>
                                    </div>
                                </div>
                                <div className={`font-bebas text-[1.15rem] leading-none shrink-0 ${ovrCls}`}>
                                    {ovr}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </aside>
    );
}
