import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/lib/store";
import {
    KNOWN_PLAYERS,
    toHex,
    getPlayerOvr,
} from "@/lib/btree-engine";
import { StatCard } from "./StatCard";
import { HexInspector } from "./HexInspector";
import { EmptyState } from "./EmptyState";
import { toast } from "sonner";

export function PlayerView() {
    const {
        state,
        resetPlayer,
        resetAll,
        downloadPatched,
        totalEdits,
        editedPlayerCount,
    } = useStore();

    const pid = state.selectedPid;

    if (!pid || !state.playerMap.has(pid)) {
        return (
            <main className="flex flex-col overflow-hidden bg-void">
                <EmptyState />
            </main>
        );
    }

    const nodes = state.playerMap.get(pid)!;
    const known = KNOWN_PLAYERS[pid];
    const name = known?.name ?? `Player ${toHex(pid)}`;
    const pidEdits = state.edits.get(pid) ?? new Map();
    const ovr = getPlayerOvr(nodes, pidEdits);
    const uniqueTrees = new Set(nodes.map((n) => n.treeId)).size;

    const handleDownload = () => {
        const count = downloadPatched();
        if (count !== undefined) {
            toast.success(
                `Exported — ${count} B-Tree node${count !== 1 ? "s" : ""} patched`
            );
        }
    };

    const handleResetPlayer = () => {
        resetPlayer(pid);
        toast.info("Player reset to original values");
    };

    const handleResetAll = () => {
        resetAll();
        toast.info("All changes discarded");
    };

    return (
        <main className="flex flex-col overflow-hidden bg-void">
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Player Header */}
                <div className="p-5 px-6 border-b border-cborder bg-deep flex items-center gap-5 shrink-0 relative overflow-hidden">
                    <div className="absolute right-0 top-0 bottom-0 w-[300px] bg-gradient-to-r from-transparent to-cyan/[0.03] pointer-events-none" />

                    <div className="font-bebas text-[4.5rem] leading-none text-cborder2 tracking-tight shrink-0 select-none">
                        {String(pid).slice(-2).padStart(2, "0")}
                    </div>

                    <div className="flex-1">
                        <div className="font-bebas text-[2rem] tracking-[.06em] leading-none text-ctext">
                            {name}
                        </div>
                        <div className="font-dmono text-[.65rem] text-ctext3 mt-1 flex gap-5 flex-wrap">
                            {known && (
                                <span>
                                    {known.pos} · {known.team}
                                </span>
                            )}
                            <span>
                                PID <span className="text-cyan">{toHex(pid)}</span>
                            </span>
                            <span>
                                Nodes <span className="text-cyan">{nodes.length}</span>
                            </span>
                            <span>
                                Trees <span className="text-cyan">{uniqueTrees}</span>
                            </span>
                        </div>
                    </div>

                    <div className="text-center shrink-0">
                        <span className="font-dmono text-[.55rem] tracking-[.15em] uppercase text-ctext3 block mb-0.5">
                            OVR
                        </span>
                        <span
                            className={`font-bebas text-[3rem] leading-none block ${ovr >= 95
                                ? "text-amber drop-shadow-[0_0_20px_rgba(255,170,0,0.3)]"
                                : "text-cyan drop-shadow-[0_0_20px_rgba(0,212,255,0.3)]"
                                }`}
                        >
                            {ovr}
                        </span>
                    </div>
                </div>

                {/* Scrollable Body */}
                <ScrollArea className="flex-1">
                    <div className="p-5 px-6 flex flex-col gap-5">
                        {/* Stat Cards */}
                        <div>
                            <div className="font-dmono text-[.6rem] tracking-[.18em] uppercase text-ctext3 flex items-center gap-3 mb-3">
                                B-Tree Attribute Nodes
                                <Separator className="flex-1 bg-cborder" />
                            </div>
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                                {nodes.map((node) => (
                                    <StatCard
                                        key={node.offset}
                                        pid={pid}
                                        node={node}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Hex Inspector */}
                        <HexInspector />
                    </div>
                </ScrollArea>

                {/* Action Bar */}
                <div className="border-t border-cborder py-3.5 px-6 flex items-center justify-between bg-deep shrink-0 gap-4">
                    <div className="font-dmono text-[.7rem] text-ctext3">
                        {totalEdits > 0 ? (
                            <>
                                <span className="text-cyan font-medium">{totalEdits}</span>{" "}
                                pending change{totalEdits !== 1 ? "s" : ""} across{" "}
                                <span className="text-cyan font-medium">
                                    {editedPlayerCount}
                                </span>{" "}
                                player{editedPlayerCount !== 1 ? "s" : ""}
                            </>
                        ) : (
                            "No pending changes"
                        )}
                    </div>
                    <div className="flex gap-2.5">
                        <Button
                            variant="outline"
                            className="bg-transparent border-cborder2 text-ctext2 font-barlow text-[.8rem] font-medium rounded-none clip-corner-sm hover:border-ctext2 hover:text-ctext disabled:opacity-30"
                            onClick={handleResetPlayer}
                            disabled={pidEdits.size === 0}
                        >
                            Reset Player
                        </Button>
                        <Button
                            variant="outline"
                            className="bg-transparent border-cborder2 text-ctext2 font-barlow text-[.8rem] font-medium rounded-none clip-corner-sm hover:border-ctext2 hover:text-ctext disabled:opacity-30"
                            onClick={handleResetAll}
                            disabled={totalEdits === 0}
                        >
                            Reset All
                        </Button>
                        <Button
                            className="bg-cyan border-cyan text-void font-barlow text-[.8rem] font-semibold rounded-none clip-corner-sm hover:bg-[#00aacc] hover:border-[#00aacc] hover:shadow-[0_0_16px_rgba(0,212,255,0.3)] disabled:opacity-30"
                            onClick={handleDownload}
                            disabled={totalEdits === 0}
                        >
                            ↓ Export .ROS
                        </Button>
                    </div>
                </div>
            </div>
        </main>
    );
}
