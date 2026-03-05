import { useStore } from "@/lib/store";
import { FLAT, SZ } from "@/lib/flat-engine";

interface HexInspectorProps {
    slot: number;
}

export function HexInspector({ slot }: HexInspectorProps) {
    const { buf } = useStore();

    if (!buf) return null;

    const base = FLAT + slot * SZ;

    const sections: { start: number; end: number; color: string; label: string }[] = [
        { start: 548, end: 590, color: "var(--color-cyan)", label: "RATINGS (b/3+25)" },
        { start: 591, end: 659, color: "var(--color-green2)", label: "TENDENCIES (raw 0-99)" },
        { start: 660, end: 684, color: "var(--color-amber)", label: "HOT SPOTS / ZONES" },
    ];

    return (
        <>
            <div
                style={{
                    fontSize: 9,
                    color: "var(--color-ctext3)",
                    marginBottom: 10,
                    fontFamily: "var(--font-dmono)",
                }}
            >
                Record @{" "}
                <span style={{ color: "var(--color-cyan)", fontFamily: "var(--font-dmono)" }}>
                    0x{base.toString(16).toUpperCase()}
                </span>
            </div>

            {sections.map(({ start, end, color, label }) => (
                <div key={start} style={{ marginBottom: 14 }}>
                    <div
                        style={{
                            fontSize: 8,
                            color,
                            marginBottom: 5,
                            fontFamily: "var(--font-dmono)",
                        }}
                    >
                        {label}
                    </div>
                    {Array.from(
                        { length: Math.ceil((end - start + 1) / 8) },
                        (_, ri) => {
                            const f = start + ri * 8;
                            const t = Math.min(end, f + 7);
                            const bytes = Array.from(
                                { length: t - f + 1 },
                                (_, j) => buf[base + f + j]
                            );
                            return (
                                <div
                                    key={ri}
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "40px 1fr 1fr",
                                        gap: 8,
                                        padding: "1px 0",
                                        fontSize: 9,
                                    }}
                                >
                                    <span
                                        style={{
                                            color: "var(--color-ctext3)",
                                            fontFamily: "var(--font-dmono)",
                                        }}
                                    >
                                        {f}
                                    </span>
                                    <span style={{ fontFamily: "var(--font-dmono)", color }}>
                                        {bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ")}
                                    </span>
                                    <span
                                        style={{
                                            fontFamily: "var(--font-dmono)",
                                            color: "var(--color-ctext3)",
                                        }}
                                    >
                                        {start === 548
                                            ? bytes.map((b) => Math.floor(b / 3) + 25).join(" ")
                                            : bytes.map((b) => b).join(" ")}
                                    </span>
                                </div>
                            );
                        }
                    )}
                </div>
            ))}
        </>
    );
}
