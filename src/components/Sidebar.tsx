import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { EMBEDDED_PLAYERS, TEAMS, POSITIONS, N, EMBEDDED_MAP } from "@/lib/flat-engine";

export function Sidebar() {
    const {
        buf,
        ovrCache,
        csvDb,
        selectedSlot,
        selectPlayer,
        getPlayerName,
    } = useStore();

    const [query, setQuery] = useState("");

    const list = useMemo(() => {
        const ql = query.toLowerCase().trim();
        let rows = EMBEDDED_PLAYERS.map(([slot, fn, ln, team, pos, jersey]) => {
            const csvI = csvDb?.[slot];
            return {
                slot,
                fn: csvI?.fn || fn,
                ln: csvI?.ln || ln,
                team: csvI?.team ?? team,
                pos: csvI?.pos ?? pos,
                jersey: csvI?.jersey ?? jersey,
                ovr: ovrCache[slot] ?? 25,
            };
        });

        if (ql) {
            // Allow searching any slot by number
            if (/^\d+$/.test(ql)) {
                const n = parseInt(ql, 10);
                if (n >= 0 && n < N && !EMBEDDED_MAP[n]) {
                    const name = getPlayerName(n);
                    rows.push({
                        slot: n,
                        fn: name.first,
                        ln: name.last || `[Slot ${n}]`,
                        team: csvDb?.[n]?.team ?? 29,
                        pos: csvDb?.[n]?.pos ?? 0,
                        jersey: csvDb?.[n]?.jersey ?? 0,
                        ovr: ovrCache[n] ?? 25,
                    });
                }
            }
            rows = rows.filter(
                (p) =>
                    `${p.fn} ${p.ln}`.toLowerCase().includes(ql) ||
                    String(p.slot) === ql
            );
        }
        rows.sort((a, b) => b.ovr - a.ovr);
        return rows;
    }, [query, ovrCache, csvDb, buf, getPlayerName]);

    const ovrColor = (v: number) =>
        v >= 90
            ? "var(--color-cyan)"
            : v >= 80
                ? "var(--color-green2)"
                : v >= 70
                    ? "var(--color-amber)"
                    : "var(--color-ctext3)";

    return (
        <div
            style={{
                width: 250,
                flexShrink: 0,
                borderRight: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                background: "var(--sidebar)",
            }}
        >
            {/* Search */}
            <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>
                <input
                    placeholder="Durant, LeBron, Kobe, slot #…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{
                        width: "100%",
                        background: "var(--background)",
                        border: "1px solid var(--border)",
                        borderRadius: 4,
                        padding: "6px 9px",
                        fontSize: 11,
                        color: "var(--color-ctext2)",
                        outline: "none",
                        boxSizing: "border-box",
                        fontFamily: "var(--font-dmono)",
                    }}
                />
                <div
                    style={{
                        fontSize: 9,
                        color: "var(--color-ctext3)",
                        marginTop: 4,
                        textAlign: "right",
                        fontFamily: "var(--font-dmono)",
                    }}
                >
                    {list.length} players
                </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: "auto" }} className="custom-scrollbar">
                {list.length === 0 && (
                    <div
                        style={{
                            padding: 20,
                            textAlign: "center",
                            fontSize: 10,
                            color: "var(--color-ctext3)",
                            lineHeight: 1.8,
                        }}
                    >
                        No results.
                        <br />
                        Try first name, last name,
                        <br />
                        or slot number.
                    </div>
                )}
                {list.map((p) => {
                    const act = selectedSlot === p.slot;
                    return (
                        <div
                            key={p.slot}
                            onClick={() => selectPlayer(p.slot)}
                            style={{
                                padding: "7px 10px",
                                cursor: "pointer",
                                borderBottom: "1px solid rgba(26, 37, 64, 0.5)",
                                background: act ? "var(--color-cyan-dim)" : "transparent",
                                borderLeft: act
                                    ? "2px solid var(--color-cyan)"
                                    : "2px solid transparent",
                                transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => {
                                if (!act)
                                    e.currentTarget.style.background = "rgba(0, 212, 255, 0.03)";
                            }}
                            onMouseLeave={(e) => {
                                if (!act) e.currentTarget.style.background = "transparent";
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 11,
                                        color: act ? "var(--foreground)" : "var(--color-ctext2)",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        maxWidth: 172,
                                        fontFamily: "var(--font-barlow)",
                                    }}
                                >
                                    {p.fn} {p.ln}
                                </span>
                                <span
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        flexShrink: 0,
                                        marginLeft: 4,
                                        color: ovrColor(p.ovr),
                                        fontFamily: "var(--font-dmono)",
                                    }}
                                >
                                    {p.ovr}
                                </span>
                            </div>
                            <div
                                style={{
                                    fontSize: 9,
                                    color: "var(--color-ctext3)",
                                    marginTop: 1,
                                    fontFamily: "var(--font-dmono)",
                                }}
                            >
                                #{p.slot} · {TEAMS[p.team] || "?"} · {POSITIONS[p.pos] || "?"}
                                {p.jersey ? ` #${p.jersey}` : ""}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
