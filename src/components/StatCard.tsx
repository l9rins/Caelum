import { useCallback } from "react";
import { useStore } from "@/lib/store";
import {
    treeLabel,
    toHex,
    floatToHex,
    statToKey,
    type BTreeNode,
} from "@/lib/btree-engine";

interface StatCardProps {
    pid: number;
    node: BTreeNode;
}

function statColor(v: number) {
    if (v >= 95) return "text-amber";
    if (v >= 85) return "text-cyan";
    if (v >= 75) return "text-green2";
    if (v >= 60) return "text-ctext2";
    return "text-ctext3";
}

function barColor(v: number) {
    if (v >= 95) return "#ffaa00";
    if (v >= 85) return "#00d4ff";
    if (v >= 75) return "#00ff88";
    if (v >= 60) return "#3a4f72";
    return "#1a2540";
}

export function StatCard({ pid, node }: StatCardProps) {
    const { state, setStat } = useStore();

    const pidEdits = state.edits.get(pid);
    const edit = pidEdits?.get(String(node.offset));
    const curStat = edit ? edit.newStat : node.stat;
    const delta = curStat - node.stat;
    const modified = delta !== 0;

    const pct = Math.max(0, Math.min(100, ((curStat - 25) / 74) * 100));
    const curFval = statToKey(curStat);

    const adjust = useCallback(
        (d: number) => {
            setStat(pid, node.offset, node.stat, curStat + d);
        },
        [pid, node.offset, node.stat, curStat, setStat]
    );

    const handleInput = useCallback(
        (raw: string) => {
            const val = parseInt(raw, 10);
            if (!isNaN(val)) setStat(pid, node.offset, node.stat, val);
        },
        [pid, node.offset, node.stat, setStat]
    );

    return (
        <div
            className={`bg-ccard border p-3.5 relative transition-colors
                ${modified
                    ? "border-cyan"
                    : "border-cborder hover:border-cborder2"
                }`}
            style={{
                clipPath:
                    "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)",
            }}
        >
            {/* Left accent stripe when modified */}
            {modified && (
                <div className="absolute left-0 top-0 h-full w-0.5 bg-cyan" />
            )}

            {/* Header row */}
            <div className="flex items-start justify-between mb-2.5">
                <div className="text-[.78rem] font-medium text-ctext leading-tight">
                    {treeLabel(node.treeId)}
                </div>
                <div className="font-dmono text-[.55rem] text-ctext3 bg-surface border border-cborder px-1.5 py-0.5 shrink-0 ml-2">
                    {toHex(node.offset, 6)}
                </div>
            </div>

            {/* Value + bar */}
            <div className="flex items-end gap-3 mb-2">
                <div
                    className={`font-bebas text-[2.4rem] leading-none transition-colors ${statColor(curStat)}`}
                >
                    {curStat}
                </div>
                <div className="flex-1 pb-1">
                    {/* Bar */}
                    <div className="h-[3px] bg-cborder mb-1.5 overflow-hidden">
                        <div
                            className="stat-bar-fill h-full"
                            style={{ width: `${pct}%`, background: barColor(curStat) }}
                        />
                    </div>
                    {/* Hex readout */}
                    <div className="font-dmono text-[.56rem] text-ctext3 leading-none">
                        key=
                        <span className="text-cyan2">{curFval.toFixed(2)}</span>
                        {" · "}
                        <span className="text-cyan2">{floatToHex(curFval)}</span>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5">
                <button
                    className="w-6 h-6 bg-surface border border-cborder text-ctext2 font-dmono text-base flex items-center justify-center transition-colors hover:bg-cyan hover:border-cyan hover:text-void disabled:opacity-20 disabled:cursor-not-allowed"
                    onClick={() => adjust(-1)}
                    disabled={curStat <= 25}
                >
                    −
                </button>
                <input
                    type="number"
                    min={25}
                    max={99}
                    value={curStat}
                    className="flex-1 max-w-[58px] bg-surface border border-cborder text-ctext font-dmono text-[.8rem] text-center py-1 outline-none focus:border-cyan transition-colors"
                    onChange={(e) => handleInput(e.target.value)}
                />
                <button
                    className="w-6 h-6 bg-surface border border-cborder text-ctext2 font-dmono text-base flex items-center justify-center transition-colors hover:bg-cyan hover:border-cyan hover:text-void disabled:opacity-20 disabled:cursor-not-allowed"
                    onClick={() => adjust(1)}
                    disabled={curStat >= 99}
                >
                    +
                </button>
                <div
                    className={`font-dmono text-[.65rem] min-w-[30px] text-right transition-colors
                        ${delta > 0 ? "text-green2" : delta < 0 ? "text-cred" : "text-transparent"}`}
                >
                    {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "+0"}
                </div>
            </div>
        </div>
    );
}
