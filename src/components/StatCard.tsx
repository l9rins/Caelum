import { useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import type { BTreeNode } from "@/lib/btree-engine";
import {
    toHex,
    statToKey,
    floatToHex,
    getStatTier,
} from "@/lib/btree-engine";
import { treeLabel } from "@/lib/btree-engine";

interface StatCardProps {
    pid: number;
    node: BTreeNode;
}

const TIER_COLORS: Record<string, string> = {
    elite: "text-amber",
    great: "text-cyan",
    good: "text-green2",
    avg: "text-ctext2",
    poor: "text-ctext3",
};

const TIER_BAR_COLORS: Record<string, string> = {
    elite: "#ffaa00",
    great: "#00d4ff",
    good: "#00ff88",
    avg: "#3a4f72",
    poor: "#1a2540",
};

export function StatCard({ pid, node }: StatCardProps) {
    const { state, setStat } = useStore();
    const pidEdits = state.edits.get(pid);
    const edit = pidEdits?.get(String(node.offset));
    const curStat = edit ? edit.newStat : node.stat;
    const origStat = node.stat;
    const delta = curStat - origStat;
    const modified = delta !== 0;
    const tier = getStatTier(curStat);
    const pct = Math.max(0, Math.min(100, ((curStat - 25) / 74) * 100));
    const curFval = statToKey(curStat);
    const label = treeLabel(node.treeId);

    const handleAdjust = useCallback(
        (d: number) => {
            setStat(pid, node.offset, origStat, curStat + d);
        },
        [pid, node.offset, origStat, curStat, setStat]
    );

    const handleInput = useCallback(
        (val: string) => {
            const n = parseInt(val, 10);
            if (!isNaN(n)) {
                setStat(pid, node.offset, origStat, n);
            }
        },
        [pid, node.offset, origStat, setStat]
    );

    return (
        <Card
            className={`bg-ccard border-cborder p-3.5 pb-3 relative transition-colors clip-corner rounded-none gap-0 ${modified ? "border-cyan" : "hover:border-cborder2"
                }`}
        >
            {/* Left accent bar */}
            {modified && (
                <div className="absolute top-0 left-0 w-0.5 h-full bg-cyan" />
            )}

            {/* Top: label + tree ID */}
            <div className="flex items-start justify-between mb-2.5">
                <span className="text-[.78rem] font-medium text-ctext leading-tight">
                    {label}
                </span>
                <Badge
                    variant="outline"
                    className="font-dmono text-[.55rem] text-ctext3 bg-surface border-cborder shrink-0 rounded-none px-1.5 py-0.5"
                >
                    {toHex(node.offset, 6)}
                </Badge>
            </div>

            {/* Value + bar */}
            <div className="flex items-end gap-3 mb-2">
                <span
                    className={`font-bebas text-[2.4rem] leading-none transition-colors ${TIER_COLORS[tier]}`}
                >
                    {curStat}
                </span>
                <div className="flex-1 pb-1">
                    <div className="h-[3px] bg-cborder mb-1.5 relative overflow-hidden">
                        <div
                            className="absolute top-0 left-0 h-full stat-bar-fill"
                            style={{
                                width: `${pct}%`,
                                background: TIER_BAR_COLORS[tier],
                            }}
                        />
                    </div>
                    <div className="font-dmono text-[.56rem] text-ctext3 leading-6">
                        key=
                        <span className="text-cyan2 tracking-[.06em]">
                            {curFval.toFixed(2)}
                        </span>{" "}
                        ·{" "}
                        <span className="text-cyan2 tracking-[.06em]">
                            {floatToHex(curFval)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 mt-2">
                <Button
                    variant="outline"
                    size="icon"
                    className="w-6 h-6 bg-surface border-cborder text-ctext2 font-dmono text-base rounded-none hover:bg-cyan hover:border-cyan hover:text-void disabled:opacity-20"
                    onClick={() => handleAdjust(-1)}
                    disabled={curStat <= 25}
                >
                    −
                </Button>
                <input
                    type="number"
                    min={25}
                    max={99}
                    value={curStat}
                    onChange={(e) => handleInput(e.target.value)}
                    className="flex-1 max-w-[58px] bg-surface border border-cborder text-ctext font-dmono text-[.8rem] text-center py-1 px-1.5 outline-none transition-colors focus:border-cyan"
                />
                <Button
                    variant="outline"
                    size="icon"
                    className="w-6 h-6 bg-surface border-cborder text-ctext2 font-dmono text-base rounded-none hover:bg-cyan hover:border-cyan hover:text-void disabled:opacity-20"
                    onClick={() => handleAdjust(1)}
                    disabled={curStat >= 99}
                >
                    +
                </Button>
                <div
                    className={`font-dmono text-[.65rem] min-w-[30px] text-right transition-colors ${delta > 0
                        ? "text-green2"
                        : delta < 0
                            ? "text-cred"
                            : "text-transparent"
                        }`}
                >
                    {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : ""}
                </div>
            </div>
        </Card>
    );
}
