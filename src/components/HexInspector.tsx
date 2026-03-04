import { useStore } from "@/lib/store";
import {
    toHex,
    treeLabel,
    statToKey,
    floatToHex,
} from "@/lib/btree-engine";

export function HexInspector() {
    const { state } = useStore();
    const pid = state.selectedPid;
    if (!pid) return null;
    const nodes = state.playerMap.get(pid);
    if (!nodes) return null;
    const pidEdits = state.edits.get(pid);

    return (
        <div className="bg-surface border border-cborder p-4">
            <div className="font-bebas text-[.9rem] tracking-[.12em] text-ctext2 mb-3 flex items-center gap-2.5">
                <span className="text-cyan text-[.8rem]">⬡</span>
                Node Inspector — raw 12-byte patterns
            </div>
            <div className="flex flex-col gap-0.5">
                {nodes.map((n) => {
                    const edit = pidEdits?.get(String(n.offset));
                    const curFval = edit ? statToKey(edit.newStat) : n.fval;
                    const stat = edit ? edit.newStat : n.stat;
                    const pHi = (pid >> 8) & 0xff;
                    const pLo = pid & 0xff;
                    const rawPid = `${pHi.toString(16).padStart(2, "0").toUpperCase()} ${pLo.toString(16).padStart(2, "0").toUpperCase()}`;
                    const fhex = floatToHex(curFval);
                    const tid = n.treeId;

                    return (
                        <div
                            key={n.offset}
                            className="grid grid-cols-[90px_1fr_1fr] gap-4 font-dmono text-[.62rem] py-1 px-1.5 bg-ccard transition-colors hover:bg-lift"
                        >
                            <span className="text-ctext3">
                                {toHex(n.offset, 6)} [T{tid >= 0 ? tid : "?"}]
                            </span>
                            <span className="text-cyan2 tracking-[.06em]">
                                01 30 {rawPid} 00 00 00 00 {fhex}
                            </span>
                            <span className="text-green2">
                                stat={stat} · {treeLabel(tid)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
