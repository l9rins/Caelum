import { useState, useEffect } from "react";

interface StatRowProps {
    label: string;
    bin: number;
    csv?: number;
    onChange: (v: number) => void;
    isTend?: boolean;
}

export function StatCard({ label, bin, csv, onChange, isTend }: StatRowProps) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState("");

    useEffect(() => {
        if (!editing) setDraft(String(bin));
    }, [bin, editing]);

    const commit = () => {
        setEditing(false);
        const n = parseInt(draft, 10);
        const min = isTend ? 0 : 25;
        if (!isNaN(n) && n >= min && n <= 99) {
            onChange(n);
        } else {
            setDraft(String(bin));
        }
    };

    const pct = isTend ? bin : ((bin - 25) / 74) * 100;
    const barColor =
        bin >= 85
            ? "var(--color-cyan)"
            : bin >= 70
                ? "var(--color-green2)"
                : bin >= 50
                    ? "var(--color-ctext2)"
                    : "var(--color-ctext3)";
    const valColor =
        bin >= 85
            ? "var(--color-cyan)"
            : bin >= 70
                ? "var(--color-green2)"
                : bin >= 50
                    ? "var(--color-ctext2)"
                    : "var(--color-ctext3)";

    const csvDiffers = csv !== undefined && csv !== bin;

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "1fr 40px 34px 86px",
                gap: 5,
                alignItems: "center",
                padding: "3px 0",
            }}
        >
            {/* Label */}
            <span
                style={{
                    fontSize: 9,
                    color: "var(--color-ctext3)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontFamily: "var(--font-dmono)",
                }}
            >
                {label}
            </span>

            {/* Binary value (editable) */}
            {editing ? (
                <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") commit();
                        if (e.key === "Escape") {
                            setEditing(false);
                            setDraft(String(bin));
                        }
                    }}
                    style={{
                        width: 36,
                        background: "var(--background)",
                        border: "1px solid var(--color-cyan)",
                        color: "var(--foreground)",
                        borderRadius: 3,
                        padding: "1px 4px",
                        fontSize: 11,
                        fontFamily: "var(--font-dmono)",
                        textAlign: "right",
                        outline: "none",
                    }}
                />
            ) : (
                <span
                    onClick={() => setEditing(true)}
                    style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: valColor,
                        cursor: "pointer",
                        fontFamily: "var(--font-dmono)",
                        minWidth: 24,
                        display: "inline-block",
                        textAlign: "right",
                    }}
                >
                    {bin}
                </span>
            )}

            {/* CSV value (read-only) */}
            <span
                style={{
                    fontSize: 10,
                    fontFamily: "var(--font-dmono)",
                    textAlign: "right",
                    color: csv !== undefined
                        ? csvDiffers
                            ? "var(--color-cred)"
                            : "var(--color-green2)"
                        : "var(--color-ctext3)",
                }}
            >
                {csv !== undefined ? csv : "—"}
            </span>

            {/* Progress bar */}
            <div
                style={{
                    height: 3,
                    background: "var(--surface)",
                    borderRadius: 2,
                    overflow: "hidden",
                    flex: 1,
                }}
            >
                <div
                    style={{
                        width: `${Math.max(0, Math.min(100, pct))}%`,
                        height: "100%",
                        background: barColor,
                        transition: "width 0.15s",
                    }}
                />
            </div>
        </div>
    );
}
