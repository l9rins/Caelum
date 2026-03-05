import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { StatCard } from "./StatCard";
import { HexInspector } from "./HexInspector";
import {
    STAT_LABELS,
    TEND_LABELS,
    HZ_LABELS,
    HZ_VALUES,
    SIG_SKILLS,
    STAT_GROUPS,
    TEAMS,
    POSITIONS,
    EMBEDDED_MAP,
} from "@/lib/flat-engine";

export function PlayerView() {
    const {
        buf,
        selectedSlot,
        csvDb,
        getSlotData,
        getPlayerName,
        doWriteStat,
        doWriteTend,
        doWriteHotZone,
        doApplyStatsFromCSV,
        doApplyTendsFromCSV,
        doApplyAllFromCSV,
    } = useStore();

    const [tab, setTab] = useState<"stats" | "tends" | "hotzones" | "sigskills" | "hex">("stats");
    const [groupIdx, setGroupIdx] = useState(0);

    const cur = useMemo(
        () => (selectedSlot !== null ? getSlotData(selectedSlot) : null),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [selectedSlot, buf]
    );

    const sel = selectedSlot;
    const csv = sel !== null ? csvDb?.[sel] ?? null : null;
    const emb = sel !== null ? EMBEDDED_MAP[sel] ?? null : null;
    const name = sel !== null ? getPlayerName(sel) : { first: "", last: "" };

    if (!cur || sel === null) {
        return (
            <div
                style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                }}
            >
                <div style={{ fontSize: 40, opacity: 0.08 }}>🏀</div>
                <div
                    style={{
                        fontSize: 11,
                        letterSpacing: "0.2em",
                        color: "var(--color-ctext3)",
                        fontFamily: "var(--font-dmono)",
                    }}
                >
                    SELECT A PLAYER
                </div>
                <div style={{ fontSize: 10, color: "var(--color-ctext3)", marginTop: 4 }}>
                    Try searching: Durant · LeBron · Kobe · Curry · Westbrook
                </div>
            </div>
        );
    }

    const pname = name.first || name.last
        ? `${name.first} ${name.last}`.trim()
        : `Slot ${sel}`;

    const info = csv || emb;

    // OVR ring
    const ovr = cur.ovr;
    const ringR = 32;
    const ringC = 2 * Math.PI * ringR;
    const ringP = (ovr - 25) / 74;
    const ringCol =
        ovr >= 88
            ? "var(--color-cyan)"
            : ovr >= 75
                ? "var(--color-green2)"
                : ovr >= 60
                    ? "var(--color-amber)"
                    : "var(--color-ctext3)";

    const Chip = ({
        col,
        children,
    }: {
        col?: string;
        children: React.ReactNode;
    }) => (
        <span
            style={{
                fontSize: 9,
                padding: "2px 7px",
                borderRadius: 2,
                fontFamily: "var(--font-dmono)",
                background: col ? `${col}15` : "var(--surface)",
                color: col || "var(--color-ctext3)",
                border: `1px solid ${col ? col + "33" : "var(--border)"}`,
            }}
        >
            {children}
        </span>
    );

    const TabBtn = ({
        active,
        onClick,
        col = "var(--color-cyan)",
        children,
    }: {
        active: boolean;
        onClick: () => void;
        col?: string;
        children: React.ReactNode;
    }) => (
        <button
            onClick={onClick}
            style={{
                background: "none",
                border: "none",
                borderBottom: active ? `2px solid ${col}` : "2px solid transparent",
                padding: "6px 12px",
                fontSize: 9,
                letterSpacing: "0.1em",
                color: active ? col : "var(--color-ctext3)",
                cursor: "pointer",
                fontFamily: "var(--font-dmono)",
            }}
        >
            {children}
        </button>
    );

    return (
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            {/* Main editor panel */}
            <div
                style={{
                    width: 430,
                    flexShrink: 0,
                    borderRight: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
            >
                {/* Player header */}
                <div
                    style={{
                        padding: "14px 18px",
                        background: "var(--card)",
                        borderBottom: "1px solid var(--border)",
                        display: "flex",
                        gap: 14,
                        alignItems: "center",
                    }}
                >
                    {/* OVR Ring */}
                    <svg width={76} height={76} viewBox="0 0 76 76">
                        <circle cx={38} cy={38} r={ringR} fill="none" stroke="var(--surface)" strokeWidth={6} />
                        <circle
                            cx={38}
                            cy={38}
                            r={ringR}
                            fill="none"
                            stroke={ringCol}
                            strokeWidth={6}
                            strokeDasharray={`${ringC * Math.max(0, ringP)} ${ringC}`}
                            strokeLinecap="round"
                            transform="rotate(-90 38 38)"
                            style={{ transition: "stroke-dasharray .3s" }}
                        />
                        <text
                            x={38}
                            y={43}
                            textAnchor="middle"
                            fill="var(--foreground)"
                            fontSize={17}
                            fontWeight={900}
                            fontFamily="var(--font-dmono)"
                        >
                            {ovr}
                        </text>
                        <text
                            x={38}
                            y={55}
                            textAnchor="middle"
                            fill="var(--color-ctext3)"
                            fontSize={7}
                            fontFamily="var(--font-dmono)"
                            letterSpacing={2}
                        >
                            OVR
                        </text>
                    </svg>

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                            style={{
                                fontSize: 20,
                                fontWeight: 900,
                                color: "var(--foreground)",
                                letterSpacing: "-0.02em",
                                fontFamily: "var(--font-barlow)",
                            }}
                        >
                            {pname}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 7 }}>
                            <Chip>#{sel}</Chip>
                            {info && (
                                <>
                                    <Chip col="var(--color-cyan)">{TEAMS[info.team] || "?"}</Chip>
                                    <Chip col="var(--color-amber)">{POSITIONS[info.pos] || "?"}</Chip>
                                    {info.jersey > 0 && <Chip col="var(--color-green2)">#{info.jersey}</Chip>}
                                </>
                            )}
                            {csv && <Chip col="var(--color-green2)">CSV ✓</Chip>}
                            {ovr >= 85 && <Chip col="var(--color-cyan)">STAR</Chip>}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div
                    style={{
                        display: "flex",
                        borderBottom: "1px solid var(--border)",
                        padding: "0 10px",
                        background: "var(--card)",
                    }}
                >
                    <TabBtn active={tab === "stats"} onClick={() => setTab("stats")}>
                        RATINGS
                    </TabBtn>
                    <TabBtn active={tab === "tends"} onClick={() => setTab("tends")} col="var(--color-green2)">
                        TENDENCIES
                    </TabBtn>
                    <TabBtn active={tab === "hotzones"} onClick={() => setTab("hotzones")} col="var(--color-amber)">
                        HOT ZONES
                    </TabBtn>
                    <TabBtn active={tab === "sigskills"} onClick={() => setTab("sigskills")} col="var(--color-cred)">
                        SIG SKILLS
                    </TabBtn>
                    <TabBtn active={tab === "hex"} onClick={() => setTab("hex")} col="var(--color-ctext3)">
                        HEX
                    </TabBtn>
                </div>

                {/* Column headers */}
                {(tab === "stats" || tab === "tends") && (
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 40px 34px 86px",
                            gap: 5,
                            padding: "4px 16px 2px",
                            background: "var(--surface)",
                            borderBottom: "1px solid var(--border)",
                        }}
                    >
                        <span style={{ fontSize: 8, color: "var(--color-ctext3)", fontFamily: "var(--font-dmono)" }}>
                            FIELD
                        </span>
                        <span
                            style={{
                                fontSize: 8,
                                color: "var(--color-cyan)",
                                textAlign: "right",
                                fontFamily: "var(--font-dmono)",
                            }}
                        >
                            BIN
                        </span>
                        <span
                            style={{
                                fontSize: 8,
                                color: "var(--color-green2)",
                                textAlign: "right",
                                fontFamily: "var(--font-dmono)",
                            }}
                        >
                            CSV
                        </span>
                        <span style={{ fontSize: 8, color: "var(--color-ctext3)", fontFamily: "var(--font-dmono)" }}>
                            BAR
                        </span>
                    </div>
                )}

                {/* Tab content */}
                <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px" }} className="custom-scrollbar">
                    {/* ─── RATINGS TAB ─── */}
                    {tab === "stats" && (
                        <>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 12 }}>
                                {STAT_GROUPS.map((g, idx) => (
                                    <button
                                        key={g.name}
                                        onClick={() => setGroupIdx(idx)}
                                        style={{
                                            background: groupIdx === idx ? g.color : "transparent",
                                            border: `1px solid ${groupIdx === idx ? g.color : "var(--border)"}`,
                                            borderRadius: 3,
                                            padding: "2px 8px",
                                            fontSize: 8,
                                            color: groupIdx === idx ? "var(--background)" : "var(--color-ctext3)",
                                            cursor: "pointer",
                                            fontFamily: "var(--font-dmono)",
                                            fontWeight: 700,
                                        }}
                                    >
                                        {g.name.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                            {STAT_GROUPS[groupIdx].indices.map((i) => (
                                <StatCard
                                    key={i}
                                    label={STAT_LABELS[i]}
                                    bin={cur.stats[i]}
                                    csv={csv?.stats[i]}
                                    onChange={(v) => doWriteStat(sel, i, v)}
                                />
                            ))}
                            {csv && (
                                <button
                                    onClick={() => doApplyStatsFromCSV(sel)}
                                    style={{
                                        marginTop: 14,
                                        width: "100%",
                                        background: "rgba(0, 212, 255, 0.06)",
                                        border: "1px solid rgba(0, 212, 255, 0.25)",
                                        borderRadius: 5,
                                        padding: 7,
                                        fontSize: 9,
                                        color: "var(--color-cyan)",
                                        cursor: "pointer",
                                        fontFamily: "var(--font-dmono)",
                                    }}
                                >
                                    ↙ WRITE ALL CSV STATS → BINARY (slot {sel})
                                </button>
                            )}
                            {!csv && (
                                <div
                                    style={{
                                        marginTop: 10,
                                        fontSize: 9,
                                        color: "var(--color-ctext3)",
                                        textAlign: "center",
                                        lineHeight: 1.8,
                                    }}
                                >
                                    Load Players.csv to see CSV values
                                    <br />
                                    and enable bulk write
                                </div>
                            )}
                        </>
                    )}

                    {/* ─── TENDENCIES TAB ─── */}
                    {tab === "tends" && (
                        <>
                            <div
                                style={{
                                    padding: "5px 10px",
                                    background: "rgba(0, 255, 136, 0.05)",
                                    border: "1px solid rgba(0, 255, 136, 0.15)",
                                    borderRadius: 5,
                                    marginBottom: 10,
                                    fontSize: 9,
                                    color: "var(--color-green2)",
                                    lineHeight: 1.7,
                                    fontFamily: "var(--font-dmono)",
                                }}
                            >
                                ✓ Confirmed: bytes 591–659, raw 0–99 (Leftos PlayerReader.cs)
                            </div>
                            {TEND_LABELS.slice(0, 57).map((label, i) => (
                                <StatCard
                                    key={i}
                                    label={label}
                                    bin={cur.tends[i]}
                                    csv={csv?.tends[i]}
                                    onChange={(v) => doWriteTend(sel, i, v)}
                                    isTend
                                />
                            ))}
                            <div
                                style={{
                                    fontSize: 8,
                                    color: "var(--color-ctext3)",
                                    margin: "12px 0 6px",
                                    fontFamily: "var(--font-dmono)",
                                    letterSpacing: "0.1em",
                                }}
                            >
                                ENGINE-INTERNAL (57–68, write as 0)
                            </div>
                            {TEND_LABELS.slice(57).map((label, i) => (
                                <StatCard
                                    key={57 + i}
                                    label={label}
                                    bin={cur.tends[57 + i]}
                                    csv={csv?.tends[57 + i]}
                                    onChange={(v) => doWriteTend(sel, 57 + i, v)}
                                    isTend
                                />
                            ))}
                            {csv && (
                                <button
                                    onClick={() => doApplyTendsFromCSV(sel)}
                                    style={{
                                        marginTop: 14,
                                        width: "100%",
                                        background: "rgba(0, 255, 136, 0.06)",
                                        border: "1px solid rgba(0, 255, 136, 0.25)",
                                        borderRadius: 5,
                                        padding: 7,
                                        fontSize: 9,
                                        color: "var(--color-green2)",
                                        cursor: "pointer",
                                        fontFamily: "var(--font-dmono)",
                                    }}
                                >
                                    ↙ WRITE ALL CSV TENDENCIES → BINARY (slot {sel})
                                </button>
                            )}
                        </>
                    )}

                    {/* ─── HOT ZONES TAB ─── */}
                    {tab === "hotzones" && (
                        <>
                            <div
                                style={{
                                    padding: "5px 10px",
                                    background: "rgba(255, 170, 0, 0.05)",
                                    border: "1px solid rgba(255, 170, 0, 0.15)",
                                    borderRadius: 5,
                                    marginBottom: 10,
                                    fontSize: 9,
                                    color: "var(--color-amber)",
                                    lineHeight: 1.7,
                                    fontFamily: "var(--font-dmono)",
                                }}
                            >
                                14 Hot Zones · 2-bit values: 0=Cold 1=Neutral 2=Hot 3=Burned
                            </div>
                            {HZ_LABELS.map((label, i) => {
                                const val = cur.hotZones[i];
                                const csvVal = csv?.hotZones[i];
                                return (
                                    <div
                                        key={i}
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: "1fr 80px 60px",
                                            gap: 8,
                                            alignItems: "center",
                                            padding: "4px 0",
                                            borderBottom: "1px solid var(--border)",
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: 10,
                                                color: "var(--color-ctext2)",
                                                fontFamily: "var(--font-dmono)",
                                            }}
                                        >
                                            {label}
                                        </span>
                                        <select
                                            value={val}
                                            onChange={(e) => doWriteHotZone(sel, i, parseInt(e.target.value, 10))}
                                            style={{
                                                background: "var(--background)",
                                                border: "1px solid var(--border)",
                                                color: "var(--foreground)",
                                                borderRadius: 3,
                                                padding: "2px 4px",
                                                fontSize: 10,
                                                fontFamily: "var(--font-dmono)",
                                            }}
                                        >
                                            {HZ_VALUES.map((lbl, vi) => (
                                                <option key={vi} value={vi}>
                                                    {vi} — {lbl}
                                                </option>
                                            ))}
                                        </select>
                                        {csvVal !== undefined && (
                                            <span
                                                style={{
                                                    fontSize: 9,
                                                    fontFamily: "var(--font-dmono)",
                                                    color: csvVal !== val ? "var(--color-cred)" : "var(--color-green2)",
                                                }}
                                            >
                                                CSV: {csvVal} ({HZ_VALUES[csvVal] || "?"})
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    )}

                    {/* ─── SIG SKILLS TAB ─── */}
                    {tab === "sigskills" && (
                        <>
                            <div
                                style={{
                                    padding: "5px 10px",
                                    background: "rgba(255, 51, 85, 0.05)",
                                    border: "1px solid rgba(255, 51, 85, 0.15)",
                                    borderRadius: 5,
                                    marginBottom: 10,
                                    fontSize: 9,
                                    color: "var(--color-cred)",
                                    lineHeight: 1.7,
                                    fontFamily: "var(--font-dmono)",
                                }}
                            >
                                2K14 Signature Skills · From RED MC Enums.txt · Read-only (CSV source)
                            </div>
                            {csv ? (
                                csv.sigSkills.map((skillIdx: number, i: number) => (
                                    <div
                                        key={i}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            padding: "6px 0",
                                            borderBottom: "1px solid var(--border)",
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: 10,
                                                color: "var(--color-ctext3)",
                                                fontFamily: "var(--font-dmono)",
                                            }}
                                        >
                                            SigSkill{i + 1}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 10,
                                                color:
                                                    skillIdx > 0
                                                        ? "var(--color-cyan)"
                                                        : "var(--color-ctext3)",
                                                fontWeight: skillIdx > 0 ? 700 : 400,
                                                fontFamily: "var(--font-dmono)",
                                            }}
                                        >
                                            [{skillIdx}] {SIG_SKILLS[skillIdx] || "Unknown"}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div
                                    style={{
                                        padding: 20,
                                        textAlign: "center",
                                        fontSize: 10,
                                        color: "var(--color-ctext3)",
                                        lineHeight: 1.8,
                                    }}
                                >
                                    Load Players.csv to view Signature Skills
                                </div>
                            )}
                        </>
                    )}

                    {/* ─── HEX TAB ─── */}
                    {tab === "hex" && <HexInspector slot={sel} />}
                </div>
            </div>

            {/* Right panel: full stat overview */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }} className="custom-scrollbar">
                <div
                    style={{
                        fontSize: 8,
                        letterSpacing: "0.15em",
                        color: "var(--color-ctext3)",
                        marginBottom: 14,
                        fontFamily: "var(--font-dmono)",
                    }}
                >
                    ALL RATINGS{csv ? " · GREEN=CSV MATCH" : ""}
                </div>
                {STAT_GROUPS.map((g, gi) => (
                    <div key={g.name} style={{ marginBottom: 18 }}>
                        <div
                            style={{
                                fontSize: 7,
                                letterSpacing: "0.15em",
                                color: g.color,
                                marginBottom: 7,
                                borderBottom: `1px solid ${g.color}22`,
                                paddingBottom: 3,
                                fontFamily: "var(--font-dmono)",
                            }}
                        >
                            {g.name.toUpperCase()}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 20px" }}>
                            {g.indices.map((i) => {
                                const v = cur.stats[i];
                                const cv = csv?.stats[i];
                                return (
                                    <div
                                        key={i}
                                        onClick={() => {
                                            setGroupIdx(gi);
                                            setTab("stats");
                                        }}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                marginBottom: 2,
                                                alignItems: "center",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: 8,
                                                    color: "var(--color-ctext3)",
                                                    fontFamily: "var(--font-dmono)",
                                                }}
                                            >
                                                {STAT_LABELS[i]}
                                            </span>
                                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                                {cv !== undefined && cv !== v && (
                                                    <span
                                                        style={{
                                                            fontSize: 8,
                                                            color: "var(--color-ctext3)",
                                                            fontFamily: "var(--font-dmono)",
                                                        }}
                                                    >
                                                        {cv}
                                                    </span>
                                                )}
                                                <span
                                                    style={{
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        fontFamily: "var(--font-dmono)",
                                                        color:
                                                            v >= 85
                                                                ? "var(--color-cyan)"
                                                                : v >= 70
                                                                    ? "var(--color-green2)"
                                                                    : v >= 50
                                                                        ? "var(--color-ctext2)"
                                                                        : "var(--color-ctext3)",
                                                    }}
                                                >
                                                    {v}
                                                </span>
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                height: 3,
                                                background: "var(--surface)",
                                                borderRadius: 2,
                                                overflow: "hidden",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: `${((v - 25) / 74) * 100}%`,
                                                    height: "100%",
                                                    background:
                                                        v >= 85
                                                            ? "var(--color-cyan)"
                                                            : v >= 70
                                                                ? "var(--color-green2)"
                                                                : v >= 50
                                                                    ? "var(--color-ctext2)"
                                                                    : "var(--color-ctext3)",
                                                    transition: "width 0.15s",
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {/* CSV Write All button */}
                {csv && (
                    <button
                        onClick={() => doApplyAllFromCSV(sel)}
                        style={{
                            marginTop: 14,
                            width: "100%",
                            background: "rgba(0, 212, 255, 0.06)",
                            border: "1px solid rgba(0, 212, 255, 0.25)",
                            borderRadius: 5,
                            padding: 9,
                            fontSize: 10,
                            color: "var(--color-cyan)",
                            cursor: "pointer",
                            fontFamily: "var(--font-dmono)",
                            fontWeight: 700,
                        }}
                    >
                        ↙ WRITE ALL FROM CSV (stats + tendencies + hot zones) → slot {sel}
                    </button>
                )}
            </div>
        </div>
    );
}
