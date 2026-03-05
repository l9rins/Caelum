import { useRef, useState } from "react";
import { useStore } from "@/lib/store";

export function EmptyState() {
    const { loadROS } = useStore();
    const [isDragging, setIsDragging] = useState(false);
    const rosRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.name.toLowerCase().endsWith(".ros")) {
            const bytes = new Uint8Array(await file.arrayBuffer());
            loadROS(bytes, file.name);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const bytes = new Uint8Array(await file.arrayBuffer());
        loadROS(bytes, file.name);
    };

    return (
        <div
            style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-barlow)",
                color: "var(--foreground)",
            }}
        >
            <div style={{ textAlign: "center", maxWidth: 460, padding: 40 }}>
                <div
                    style={{
                        fontSize: 9,
                        letterSpacing: "0.5em",
                        color: "var(--color-cyan)",
                        marginBottom: 12,
                        fontFamily: "var(--font-dmono)",
                    }}
                >
                    NBA 2K14 · BINARY ROSTER EDITOR
                </div>
                <h1
                    style={{
                        margin: 0,
                        fontSize: 72,
                        fontWeight: 900,
                        letterSpacing: "-0.05em",
                        lineHeight: 0.9,
                        fontFamily: "var(--font-bebas)",
                        background: "linear-gradient(135deg, var(--color-cyan), var(--color-cyan2))",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}
                >
                    CAELUM
                </h1>
                <div
                    style={{
                        fontSize: 10,
                        color: "var(--color-ctext3)",
                        margin: "8px 0 40px",
                        letterSpacing: "0.2em",
                        fontFamily: "var(--font-dmono)",
                    }}
                >
                    v6 · 215 PLAYERS BUILT-IN · SEARCH BY NAME INSTANTLY
                </div>
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => rosRef.current?.click()}
                    style={{
                        border: `2px dashed ${isDragging ? "var(--color-cyan)" : "var(--color-cborder)"}`,
                        borderRadius: 10,
                        padding: 32,
                        cursor: "pointer",
                        transition: "all .2s",
                        marginBottom: 12,
                        background: isDragging ? "var(--color-cyan-dim)" : "transparent",
                    }}
                >
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>
                    <div style={{ fontSize: 13, color: "var(--color-ctext2)" }}>
                        Click or drag to load NBA_Year_2013-14.ROS
                    </div>
                    <div style={{ fontSize: 9, color: "var(--color-ctext3)", marginTop: 4 }}>
                        Then search Durant, LeBron, Kobe, Curry…
                    </div>
                </div>
                <div style={{ fontSize: 9, color: "var(--color-ctext3)", marginTop: 16 }}>
                    Optionally load Players.csv (UTF-16) for CSV comparison & bulk writes
                </div>
                <input
                    ref={rosRef}
                    type="file"
                    accept=".ROS,.ros"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                />
            </div>
        </div>
    );
}
