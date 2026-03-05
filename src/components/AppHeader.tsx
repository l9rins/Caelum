import { useRef } from "react";
import { useStore } from "@/lib/store";

export function AppHeader() {
    const { buf, csvFileName, crcOk, status, exportROS, loadROS, loadCSV } = useStore();
    const rosRef = useRef<HTMLInputElement>(null);
    const csvRef = useRef<HTMLInputElement>(null);

    const onROS = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const rd = new FileReader();
        rd.onload = (ev) => {
            loadROS(new Uint8Array(ev.target!.result as ArrayBuffer), f.name);
        };
        rd.readAsArrayBuffer(f);
        if (rosRef.current) rosRef.current.value = "";
    };

    const onCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const rd = new FileReader();
        rd.onload = (ev) => {
            loadCSV(ev.target!.result as string, f.name);
        };
        rd.readAsText(f, "utf-16");
        if (csvRef.current) csvRef.current.value = "";
    };

    return (
        <header
            style={{
                height: 44,
                background: "var(--card)",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                padding: "0 14px",
                gap: 10,
                flexShrink: 0,
                zIndex: 50,
            }}
        >
            {/* Logo */}
            <span
                style={{
                    fontSize: 16,
                    fontWeight: 900,
                    letterSpacing: "-0.04em",
                    fontFamily: "var(--font-bebas), sans-serif",
                    background: "linear-gradient(135deg, var(--color-cyan), var(--color-cyan2))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                }}
            >
                CAELUM
            </span>
            <span style={{ color: "var(--border)" }}>|</span>

            {/* CRC Badge */}
            {buf && (
                <div
                    style={{
                        fontSize: 9,
                        padding: "2px 8px",
                        borderRadius: 3,
                        fontFamily: "var(--font-dmono)",
                        background: crcOk ? "rgba(0, 255, 136, 0.08)" : "rgba(255, 51, 85, 0.08)",
                        color: crcOk ? "var(--color-green2)" : "var(--color-cred)",
                        border: `1px solid ${crcOk ? "rgba(0, 255, 136, 0.2)" : "rgba(255, 51, 85, 0.2)"}`,
                    }}
                >
                    {crcOk ? "✓ CRC OK" : "✗ CRC BAD"}
                </div>
            )}

            {/* CSV Badge */}
            {buf && (
                csvFileName ? (
                    <div
                        style={{
                            fontSize: 9,
                            padding: "2px 8px",
                            borderRadius: 3,
                            fontFamily: "var(--font-dmono)",
                            background: "rgba(0, 255, 136, 0.08)",
                            color: "var(--color-green2)",
                            border: "1px solid rgba(0, 255, 136, 0.2)",
                        }}
                    >
                        ✓ CSV
                    </div>
                ) : (
                    <div
                        onClick={() => csvRef.current?.click()}
                        style={{
                            fontSize: 9,
                            padding: "2px 8px",
                            borderRadius: 3,
                            fontFamily: "var(--font-dmono)",
                            background: "rgba(0, 212, 255, 0.06)",
                            color: "var(--color-cyan)",
                            border: "1px solid rgba(0, 212, 255, 0.15)",
                            cursor: "pointer",
                        }}
                    >
                        + Load CSV
                    </div>
                )
            )}

            <input ref={csvRef} type="file" accept=".csv,.CSV" onChange={onCSV} style={{ display: "none" }} />

            {/* Status */}
            <div
                style={{
                    flex: 1,
                    fontSize: 9,
                    color: "var(--color-ctext3)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontFamily: "var(--font-dmono)",
                }}
            >
                {status}
            </div>

            {/* File buttons */}
            <input ref={rosRef} type="file" accept=".ROS,.ros" onChange={onROS} style={{ display: "none" }} />

            {!buf && (
                <button
                    onClick={() => rosRef.current?.click()}
                    style={{
                        background: "var(--color-lift)",
                        border: "1px solid var(--color-cborder)",
                        borderRadius: 5,
                        padding: "5px 14px",
                        fontSize: 9,
                        fontWeight: 700,
                        color: "var(--color-ctext)",
                        cursor: "pointer",
                        fontFamily: "var(--font-dmono)",
                    }}
                >
                    📦 OPEN .ROS
                </button>
            )}

            {buf && (
                <button
                    onClick={exportROS}
                    style={{
                        background: "linear-gradient(135deg, var(--color-cyan), var(--color-cyan2))",
                        border: "none",
                        borderRadius: 5,
                        padding: "5px 14px",
                        fontSize: 9,
                        fontWeight: 700,
                        color: "var(--background)",
                        cursor: "pointer",
                        fontFamily: "var(--font-dmono)",
                    }}
                >
                    ↓ EXPORT .ROS
                </button>
            )}
        </header>
    );
}
