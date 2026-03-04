export function EmptyState() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 text-center">
            {/* Animated hex grid */}
            <div
                className="grid gap-1.5 mb-2 opacity-25"
                style={{ gridTemplateColumns: "repeat(6, 28px)" }}
            >
                {Array.from({ length: 12 }).map((_, i) => (
                    <div
                        key={i}
                        className="w-7 h-7 bg-cborder animate-hex-pulse clip-hex"
                        style={{
                            animationDelay: `${(i % 3) * 0.5}s`,
                            background:
                                i % 2 === 0 ? "var(--color-cborder)" : "var(--color-cborder2)",
                        }}
                    />
                ))}
            </div>

            <div className="font-bebas text-[2rem] tracking-[.12em] text-ctext2 leading-none">
                Select a Player
            </div>

            <div className="font-dmono text-[.72rem] text-ctext3 max-w-[360px] leading-7">
                Load an NBA 2K14 .ROS file, then select a player from the sidebar to
                inspect and edit their B-Tree attribute nodes.
            </div>

            {/* Engine spec */}
            <div className="font-dmono text-[.65rem] border border-cborder bg-surface px-5 py-3 text-left leading-8 text-ctext3">
                <div>
                    Engine{" "}
                    <span className="text-cyan">B-Tree Float32 Patcher v2</span>
                </div>
                <div>
                    Region{" "}
                    <span className="text-cyan">0x009EB4 → 0x0C2F74</span>
                </div>
                <div>
                    Formula{" "}
                    <span className="text-cyan">key = 127 × (stat + 69) / 100</span>
                </div>
                <div>
                    Trees{" "}
                    <span className="text-cyan">37 attribute segments mapped</span>
                </div>
                <div>
                    Method{" "}
                    <span className="text-green2">
                        In-place 4-byte patch · CRC32 recalc · No rebuild
                    </span>
                </div>
            </div>
        </div>
    );
}
