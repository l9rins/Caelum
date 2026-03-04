import { useStore } from "@/lib/store";
import {
    toHex,
    floatToHex,
    statToKey,
    treeLabel,
} from "@/lib/btree-engine";

export function HexInspector() {
    const { state } = useStore();
    const pid = state.selectedPid;
    if (!pid || !state.playerMap.has(pid)) return null;

    const nodes = state.playerMap.get(pid)!;
    const pidEdits = state.edits.get(pid);
    const pidHi = (pid >> 8) & 0xff;
    const pidLo = pid & 0xff;
    const pidHex =
        pidHi.toString(16).padStart(2, "0").toUpperCase() +
        " " +
        pidLo.toString(16).padStart(2, "0").toUpperCase();

    return (
        <div className="bg-surface border border-cborder p-4">
            {/* Title */}
            <div className="font-bebas text-[.9rem] tracking-[.12em] text-ctext2 mb-3 flex items-center gap-2">
                <span className="text-cyan">⬡</span>
                Node Inspector — raw 12-byte patterns
            </div>

            <div className="flex flex-col gap-0.5">
                {nodes.map((node) => {
                    const edit = pidEdits?.get(String(node.offset));
                    const curStat = edit ? edit.newStat : node.stat;
                    const curFval = statToKey(curStat);
                    const fHex = floatToHex(curFval);
                    const tid = node.treeId;
                    const modified = edit !== undefined;

                    return (
                        <div
                            key={node.offset}
                            className={`grid font-dmono text-[.62rem] px-2 py-1.5 transition-colors hover:bg-lift
                                ${modified ? "bg-cyan/[0.04] border-l border-l-cyan" : "bg-ccard"}`}
                            style={{
                                gridTemplateColumns: "90px 1fr 1fr",
                                gap: "1rem",
                            }}
                        >
                            {/* Offset + tree */}
                            <span className="text-ctext3">
                                {toHex(node.offset, 6)}{" "}
                                <span className="text-ctext3/60">[T{tid >= 0 ? tid : "?"}]</span>
                            </span>

                            {/* Raw bytes */}
                            <span className="text-cyan2 tracking-[.06em]">
                                01 30 {pidHex} 00 00 00 00 {fHex}
                            </span>

                            {/* Decoded */}
                            <span className="text-green2">
                                stat={curStat}
                                {modified && (
                                    <span className="text-amber ml-1">
                                        ← was {node.stat}
                                    </span>
                                )}{" "}
                                · {treeLabel(tid)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
