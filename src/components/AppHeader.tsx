import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { fmtBytes } from "@/lib/btree-engine";

export function AppHeader() {
    const { state, totalEdits } = useStore();
    const fi = state.fileInfo;

    return (
        <header className="col-span-2 flex items-center bg-deep border-b border-cborder relative overflow-hidden h-[52px]">
            {/* Bottom glow line */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan to-transparent opacity-30" />

            {/* Brand */}
            <div className="flex items-center gap-0 h-full px-5 border-r border-cborder shrink-0">
                <div className="w-7 h-7 relative mr-2.5 shrink-0">
                    <svg viewBox="0 0 28 28" fill="none" className="w-full h-full">
                        <polygon
                            points="14,1 27,7.5 27,20.5 14,27 1,20.5 1,7.5"
                            stroke="#00d4ff"
                            strokeWidth="1"
                            fill="rgba(0,212,255,0.06)"
                        />
                        <polygon
                            points="14,6 22,10.5 22,19.5 14,24 6,19.5 6,10.5"
                            stroke="#00d4ff"
                            strokeWidth=".5"
                            fill="rgba(0,212,255,0.04)"
                            opacity=".5"
                        />
                        <circle cx="14" cy="14" r="2" fill="#00d4ff" opacity=".8" />
                        <line x1="14" y1="1" x2="14" y2="6" stroke="#00d4ff" strokeWidth=".5" opacity=".4" />
                        <line x1="14" y1="24" x2="14" y2="27" stroke="#00d4ff" strokeWidth=".5" opacity=".4" />
                        <line x1="1" y1="7.5" x2="6" y2="10.5" stroke="#00d4ff" strokeWidth=".5" opacity=".4" />
                        <line x1="22" y1="19.5" x2="27" y2="20.5" stroke="#00d4ff" strokeWidth=".5" opacity=".4" />
                    </svg>
                </div>
                <div className="font-bebas text-[1.35rem] tracking-[.18em] text-ctext leading-none">
                    CAE<span className="text-cyan">LUM</span>
                </div>
            </div>

            {/* File info */}
            <div className="flex items-center gap-3 font-dmono text-[.7rem] text-ctext2 flex-1">
                <div className="w-px h-7 bg-cborder mx-4" />
                <span className="text-cyan">{fi?.name ?? "—"}</span>
                <span className="text-cborder2">·</span>
                <span>{fi ? fmtBytes(fi.size) : "no file"}</span>
                <span className="text-cborder2">·</span>
                <span>{fi ? `${fi.nodeCount} nodes` : "0 nodes"}</span>
                <span className="text-cborder2">·</span>
                <span>{fi ? `${fi.scanTime}ms` : "—"}</span>
            </div>

            {/* Right badges */}
            <div className="flex items-center gap-3 px-5 ml-auto">
                <Badge
                    variant="outline"
                    className="font-dmono text-[.6rem] tracking-[.12em] uppercase border-cyan text-cyan shadow-[0_0_8px_rgba(0,212,255,0.2)] rounded-none"
                >
                    B-Tree Engine v2
                </Badge>
                <Badge
                    variant="outline"
                    className="font-dmono text-[.6rem] tracking-[.12em] uppercase border-cborder2 text-ctext3 rounded-none"
                >
                    0x009EB4 → 0x0C2F74
                </Badge>
                {totalEdits > 0 && (
                    <div className="font-dmono text-[.65rem] tracking-[.08em] px-3 py-1 bg-cyan text-void font-medium animate-pulse-badge">
                        {totalEdits} edit{totalEdits !== 1 ? "s" : ""}
                    </div>
                )}
            </div>
        </header>
    );
}
