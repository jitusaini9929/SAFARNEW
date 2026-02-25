import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { focusService, FocusStats } from "@/utils/focusService";
import { useFocus } from "@/contexts/FocusContext";
import { useTheme } from "@/contexts/ThemeContext";

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────────
const BASE = {
  teal900: "#134e4a", teal800: "#115e59", teal700: "#0f766e",
  teal600: "#0d9488", teal500: "#14b8a6", teal400: "#2dd4bf",
  teal200: "#99f6e4", teal100: "#ccfbf1", teal50: "#f0fdf9",
  maroon800: "#9b1c1c", maroon700: "#c81e1e",
  maroon100: "#fde8e8", maroon50: "#fff5f5",
  slate900: "#0f172a", slate800: "#1e293b", slate700: "#334155",
  slate600: "#475569", slate500: "#64748b", slate400: "#94a3b8",
  slate300: "#cbd5e1", slate200: "#e2e8f0", slate100: "#f1f5f9", slate50: "#f8fafc",
  amber500: "#f59e0b", amber50: "#fffbeb",
  indigo500: "#6366f1", indigo50: "#eef2ff",
  orange500: "#f97316", orange50: "#fff7ed",
  white: "#ffffff",
  trueWhite: "#ffffff",
  darkBg: "#0f172a",
  darkCard: "#1e293b",
  darkCardHover: "#334155",
  darkText: "#f8fafc",
  darkTextMuted: "#94a3b8",
  darkBorder: "#334155",
};

type Palette = typeof BASE;

const buildPalette = (isDark: boolean): Palette => {
  if (!isDark) return BASE;
  return {
    ...BASE,
    white: BASE.darkCard,
    slate900: BASE.darkText,
    slate800: "#e2e8f0",
    slate700: "#cbd5e1",
    slate600: BASE.darkTextMuted,
    slate500: BASE.darkTextMuted,
    slate400: "#64748b",
    slate300: "#475569",
    slate200: BASE.darkBorder,
    slate100: "#1f2937",
    slate50: BASE.darkBg,
    teal50: "rgba(20, 184, 166, 0.12)",
    teal100: "rgba(20, 184, 166, 0.18)",
    teal200: "rgba(45, 212, 191, 0.32)",
    maroon50: "rgba(248, 113, 113, 0.14)",
    maroon100: "rgba(248, 113, 113, 0.22)",
    amber50: "rgba(245, 158, 11, 0.16)",
    indigo50: "rgba(99, 102, 241, 0.16)",
  };
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────────
const fmtMins = (m: number) =>
  m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;

const fmtAgo = (iso: string) => {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 3600000);
  if (diff < 1) return "Just now";
  if (diff < 24) return `${diff}h ago`;
  if (diff < 48) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── ICON HELPERS (inline SVG) ───────────────────────────────────────────────────
const Icon = ({ d, size = 18, color = "currentColor", strokeWidth = 2 }: { d: string; size?: number; color?: string; strokeWidth?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const Icons = {
  ArrowLeft: () => <Icon d="M19 12H5M12 19l-7-7 7-7" />,
  Zap: () => <Icon d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
  Check: ({ color }: { color?: string }) => <Icon d="M20 6L9 17l-5-5" color={color || "currentColor"} />,
  X: ({ color }: { color?: string }) => <Icon d="M18 6L6 18M6 6l12 12" color={color || "currentColor"} />,
  Flame: () => <Icon d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 3z" />,
  Target: () => <><Icon d="M22 12A10 10 0 1112 2" /><Icon d="M22 12A10 10 0 0012 2" /><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" /></>,
  BarChart: () => <Icon d="M18 20V10M12 20V4M6 20v-6" />,
  TrendUp: () => <Icon d="M23 6l-9.5 9.5-5-5L1 18" />,
  Calendar: () => <Icon d="M3 9h18M3 4h18a2 2 0 012 2v14a2 2 0 01-2 2H3a2 2 0 01-2-2V6a2 2 0 012-2zM8 2v4M16 2v4" />,
  List: () => <Icon d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
};

// ─── STAT CARD ───────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, palette, accent = palette.teal700, bg = palette.teal50 }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: string; bg?: string; palette: Palette }) => (
  <div style={{
    background: palette.white, border: `1px solid ${palette.slate200}`, borderRadius: 18,
    padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    display: "flex", alignItems: "center", gap: 14,
  }}>
    <div style={{
      width: 44, height: 44, borderRadius: 12, background: bg, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center", color: accent,
    }}>{icon}</div>
    <div>
      <div style={{ fontSize: 10, color: palette.slate500, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: palette.slate900, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: palette.slate400, marginTop: 4 }}>{sub}</div>}
    </div>
  </div>
);

// ─── WEEKLY CHART ────────────────────────────────────────────────────────────────
const WeeklyChart = ({ focusData, breakData, palette }: { focusData: number[]; breakData: number[]; palette: Palette }) => {
  const totals = focusData.map((f, i) => f + (breakData[i] || 0));
  const maxVal = Math.max(...totals, 30);
  const todayIdx = (new Date().getDay() + 6) % 7;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 130, padding: "0 2px" }}>
      {focusData.map((focus, i) => {
        const brk = breakData[i] || 0;
        const total = focus + brk;
        const pct = (total / maxVal) * 100;
        const fPct = total > 0 ? (focus / total) * 100 : 0;
        const isTd = i === todayIdx;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, height: "100%" }}>
            {total > 0 && (
              <span style={{ fontSize: 9, color: isTd ? palette.teal700 : palette.slate400, fontWeight: 700, whiteSpace: "nowrap" }}>
                {fmtMins(total)}
              </span>
            )}
            <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              {total > 0 ? (
                <div style={{
                  width: "100%", height: `${pct}%`, minHeight: 6,
                  borderRadius: "6px 6px 3px 3px", overflow: "hidden",
                  display: "flex", flexDirection: "column",
                  boxShadow: isTd ? "0 2px 8px rgba(17,94,89,0.25)" : "none",
                }}>
                  <div style={{ width: "100%", flex: 100 - fPct, background: isTd ? "rgba(148,163,184,0.6)" : palette.slate200, minHeight: brk > 0 ? 3 : 0 }} />
                  <div style={{ width: "100%", flex: fPct, background: isTd ? `linear-gradient(180deg,${palette.teal400},${palette.teal700})` : palette.teal400, minHeight: 3 }} />
                </div>
              ) : (
                <div style={{ width: "100%", height: 4, background: palette.slate100, borderRadius: 4 }} />
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: isTd ? 800 : 500, color: isTd ? palette.teal700 : palette.slate400 }}>{DAYS[i]}</span>
          </div>
        );
      })}
    </div>
  );
};

// ─── HOURLY CHART ────────────────────────────────────────────────────────────────
const HourlyChart = ({ data, palette }: { data: number[]; palette: Palette }) => {
  const maxVal = Math.max(...data, 1);
  const peakHour = data.indexOf(maxVal);
  const peakLabel = peakHour < 12
    ? `${peakHour === 0 ? 12 : peakHour}am`
    : peakHour === 12 ? "12pm" : `${peakHour - 12}pm`;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 64 }}>
        {data.map((m, h) => {
          const pct = (m / maxVal) * 100;
          const isPeak = h === peakHour && m > 0;
          return (
            <div key={h} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
              <div style={{
                width: "100%",
                height: `${Math.max(pct, m > 0 ? 6 : 2)}%`,
                minHeight: m > 0 ? 3 : 1,
                background: isPeak
                  ? `linear-gradient(180deg,${palette.teal400},${palette.teal700})`
                  : m > 0 ? palette.teal200 : palette.slate100,
                borderRadius: "3px 3px 1px 1px",
              }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, paddingLeft: 1 }}>
        {["12am", "6am", "12pm", "5pm", "11pm"].map((l, i) => (
          <span key={i} style={{ fontSize: 9, color: palette.slate400, fontWeight: 600 }}>{l}</span>
        ))}
      </div>
      {maxVal > 0 && (
        <div style={{ marginTop: 12, fontSize: 11, color: palette.teal700, fontWeight: 600, background: palette.teal50, borderRadius: 8, padding: "7px 11px", display: "inline-flex", alignItems: "center", gap: 6 }}>
          ⚡ Peak focus: {peakLabel} · {fmtMins(maxVal)} that hour
        </div>
      )}
    </div>
  );
};

// ─── GOALS PROGRESS ─────────────────────────────────────────────────────────────
const GoalsProgress = ({ goalsSet, goalsCompleted, palette }: { goalsSet: number; goalsCompleted: number; palette: Palette }) => {
  const completionRate = goalsSet > 0 ? Math.round((goalsCompleted / goalsSet) * 100) : 0;
  const remaining = Math.max(goalsSet - goalsCompleted, 0);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: palette.slate700, fontWeight: 600 }}>Goals Completed</span>
        <span style={{ fontSize: 12, color: palette.teal700, fontWeight: 800 }}>{goalsCompleted} / {goalsSet}</span>
      </div>
      <div style={{ height: 8, background: palette.slate100, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${completionRate}%`, background: palette.teal600, borderRadius: 10, transition: "width 0.6s ease" }} />
      </div>
      <div style={{ fontSize: 10, color: palette.slate400, marginTop: 6 }}>
        {completionRate}% complete · {remaining} remaining
      </div>
    </div>
  );
};

// ─── SESSION HISTORY ────────────────────────────────────────────────────────────
const SessionHistory = ({ sessions, palette }: { sessions: FocusStats["recentSessions"]; palette: Palette }) => {
  if (sessions.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0", color: palette.slate400, fontSize: 12 }}>
        No sessions recorded yet.
      </div>
    );
  }

  return (
    <div>
      {sessions.map((s, i) => {
        const pct = Math.round((s.actualMinutes / Math.max(s.durationMinutes, 1)) * 100);
        return (
          <div key={s.id} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "11px 4px",
            borderBottom: i < sessions.length - 1 ? `1px solid ${palette.slate50}` : "none",
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
              background: s.completed ? palette.teal50 : palette.maroon50,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {s.completed
                ? <Icons.Check color={palette.teal700} />
                : <Icons.X color={palette.maroon700} />
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: palette.slate700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {s.taskText || <span style={{ color: palette.slate400, fontStyle: "italic" }}>No task set</span>}
              </div>
              <div style={{ fontSize: 10, color: palette.slate400, marginTop: 2 }}>
                {fmtAgo(s.startedAt)}
                {!s.completed && ` · Stopped at ${pct}%`}
              </div>
            </div>
            <div style={{
              background: s.completed ? palette.teal50 : palette.slate100,
              color: s.completed ? palette.teal700 : palette.slate500,
              borderRadius: 8, padding: "3px 9px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
            }}>
              {s.actualMinutes}m
              {s.actualMinutes !== s.durationMinutes && (
                <span style={{ color: palette.slate400, fontWeight: 400 }}> / {s.durationMinutes}m</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

type FocusAnalyticsProps = {
  onBack?: () => void;
};

export default function FocusAnalytics({ onBack }: FocusAnalyticsProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const palette = buildPalette(isDark);
  const { setMode, setTimerDuration, setBreakDuration, setLongBreakDuration, startTimer } = useFocus();
  const [stats, setStats] = useState<FocusStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const data = await focusService.getStats();
      if (!mounted) return;
      setStats(data);
      setLoading(false);
    };
    load();

    const id = window.setInterval(load, 60000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, []);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    navigate("/study");
  };

  const startFocus = (minutes: number) => {
    setMode("Timer");
    setTimerDuration(minutes);
    startTimer();
    handleBack();
  };

  const startShortBreak = (minutes: number) => {
    setMode("short");
    setBreakDuration(minutes);
    startTimer();
    handleBack();
  };

  const startLongBreak = (minutes: number) => {
    setMode("long");
    setLongBreakDuration(minutes);
    startTimer();
    handleBack();
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: palette.slate50, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", border: `3px solid ${palette.teal200}`, borderTopColor: palette.teal700, animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ fontSize: 13, color: palette.slate400, margin: 0 }}>Loading your stats…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!stats) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: palette.slate50 }}>
      <p style={{ color: palette.maroon700 }}>Could not load analytics.</p>
    </div>
  );

  const {
    totalFocusMinutes, totalBreakMinutes, totalSessions, completedSessions,
    focusStreak, dailyGoalMinutes, dailyGoalProgress,
    weeklyData, weeklyBreaks, hourlyDistribution,
    goalsSet, goalsCompleted, recentSessions,
  } = stats;

  const todayIdx = (new Date().getDay() + 6) % 7;
  const todayFocusMinutes = weeklyData[todayIdx] || 0;
  const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
  const abandonedCount = totalSessions - completedSessions;
  const circumference = 2 * Math.PI * 36;

  return (
    <div style={{ minHeight: "100vh", background: palette.slate50, fontFamily: "'Plus Jakarta Sans',sans-serif", color: palette.slate800, overflowX: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        .fa-stat-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 20px; }
        .fa-chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        @media (max-width: 900px) {
          .fa-stat-grid { grid-template-columns: repeat(2,1fr); }
        }
        @media (max-width: 640px) {
          .fa-stat-grid { grid-template-columns: 1fr; }
          .fa-chart-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "28px 16px" }}>

        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 26 }}>
          <button onClick={handleBack} style={{ width: 40, height: 40, borderRadius: 12, background: palette.white, border: `1px solid ${palette.slate200}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Icons.ArrowLeft />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 23, fontWeight: 800, color: palette.slate900, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: palette.teal700, display: "flex" }}><Icons.BarChart /></span> Focus Analytics
            </h1>
            <p style={{ fontSize: 12, color: palette.slate500, margin: "3px 0 0" }}>Your productivity insights · auto-refreshes every 60s</p>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, background: palette.teal50, color: palette.teal700, border: `1px solid ${palette.teal200}`, borderRadius: 20, padding: "5px 14px" }}>
            This Week
          </span>
        </div>

        {/* QUICK ACTIONS */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
          <button onClick={() => startFocus(25)} style={{ background: palette.teal700, color: palette.trueWhite, border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Start 25m Focus
          </button>
          <button onClick={() => startFocus(50)} style={{ background: palette.teal600, color: palette.trueWhite, border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Start 50m Focus
          </button>
          <button onClick={() => startShortBreak(5)} style={{ background: isDark ? palette.darkCardHover : palette.slate700, color: palette.trueWhite, border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            5m Break
          </button>
          <button onClick={() => startLongBreak(15)} style={{ background: isDark ? palette.darkCard : palette.slate600, color: palette.trueWhite, border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            15m Long Break
          </button>
        </div>

        {/* TOP STAT CARDS */}
        <div className="fa-stat-grid">
          <StatCard
            icon={<Icons.Zap />}
            label="Total Focus Time"
            value={fmtMins(totalFocusMinutes)}
            sub={`+ ${fmtMins(totalBreakMinutes)} in breaks`}
            accent={palette.teal700} bg={palette.teal50}
            palette={palette}
          />
          <StatCard
            icon={<Icons.Check color={completionRate >= 70 ? palette.teal700 : palette.amber500} />}
            label="Session Quality"
            value={`${completionRate}%`}
            sub={`${completedSessions} done · ${abandonedCount} abandoned`}
            accent={completionRate >= 70 ? palette.teal700 : palette.amber500}
            bg={completionRate >= 70 ? palette.teal50 : palette.amber50}
            palette={palette}
          />
          <StatCard
            icon={<Icons.Flame />}
            label="Day Streak"
            value={`${focusStreak} days`}
            sub={`Keep it going`}
            accent={focusStreak > 0 ? palette.orange500 : palette.slate400}
            bg={focusStreak > 0 ? palette.orange50 : palette.slate50}
            palette={palette}
          />
          <StatCard
            icon={<Icons.Target />}
            label="Daily Goal"
            value={`${dailyGoalProgress}%`}
            sub={`${todayFocusMinutes}m of ${dailyGoalMinutes}m target`}
            accent={dailyGoalProgress >= 100 ? palette.teal700 : palette.indigo500}
            bg={dailyGoalProgress >= 100 ? palette.teal50 : palette.indigo50}
            palette={palette}
          />
        </div>

        {/* DAILY GOAL BAR */}
        <div style={{ background: palette.white, border: `1px solid ${palette.slate200}`, borderRadius: 16, padding: "14px 20px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: palette.slate700 }}>Today's Focus Goal</span>
            <span style={{ fontSize: 12, color: palette.slate500 }}>{todayFocusMinutes}m / {dailyGoalMinutes}m</span>
          </div>
          <div style={{ height: 10, background: palette.slate100, borderRadius: 10, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${Math.min(dailyGoalProgress, 100)}%`,
              background: `linear-gradient(90deg,${palette.indigo500},${palette.teal600})`,
              borderRadius: 10, transition: "width 0.7s ease",
            }} />
          </div>
          {dailyGoalProgress >= 100 && (
            <p style={{ fontSize: 11, color: palette.teal700, fontWeight: 700, margin: "6px 0 0" }}>🎉 Daily goal achieved!</p>
          )}
        </div>

        {/* MAIN GRID ROW 1 */}
        <div className="fa-chart-grid">

          {/* Weekly chart */}
          <div style={{ background: palette.white, border: `1px solid ${palette.slate200}`, borderRadius: 20, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: palette.slate800, margin: 0 }}>Weekly Overview</h3>
                <p style={{ fontSize: 11, color: palette.slate400, margin: "3px 0 0" }}>Focus vs break time per day</p>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {[{ c: palette.teal400, l: "FOCUS" }, { c: palette.slate300, l: "BREAK" }].map(({ c, l }) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: palette.slate500 }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
            <WeeklyChart focusData={weeklyData} breakData={weeklyBreaks} palette={palette} />
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${palette.slate100}`, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: palette.slate500 }}>Week total</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: palette.teal700 }}>{fmtMins(weeklyData.reduce((a, b) => a + b, 0))} focus</span>
            </div>
          </div>

          {/* Hourly chart */}
          <div style={{ background: palette.white, border: `1px solid ${palette.slate200}`, borderRadius: 20, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: palette.slate800, margin: "0 0 4px" }}>When You Focus Best</h3>
            <p style={{ fontSize: 11, color: palette.slate400, margin: "0 0 18px" }}>Hourly distribution across all sessions</p>
            <HourlyChart data={hourlyDistribution} palette={palette} />
          </div>
        </div>

        {/* MAIN GRID ROW 2 */}
        <div className="fa-chart-grid">

          {/* Goals progress */}
          <div style={{ background: palette.white, border: `1px solid ${palette.slate200}`, borderRadius: 20, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ color: palette.teal700, display: "flex" }}><Icons.List /></span>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: palette.slate800, margin: 0 }}>Goals Progress</h3>
            </div>
            <p style={{ fontSize: 11, color: palette.slate400, margin: "0 0 18px" }}>How focus sessions align with goal completion</p>
            <GoalsProgress goalsSet={goalsSet} goalsCompleted={goalsCompleted} palette={palette} />
          </div>

          {/* Session quality donut */}
          <div style={{ background: palette.white, border: `1px solid ${palette.slate200}`, borderRadius: 20, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ color: palette.teal700, display: "flex" }}><Icons.TrendUp /></span>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: palette.slate800, margin: 0 }}>Session Quality</h3>
            </div>
            <p style={{ fontSize: 11, color: palette.slate400, margin: "0 0 18px" }}>Completion breakdown across all sessions</p>

            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 18 }}>
              <svg width={88} height={88} viewBox="0 0 90 90">
                <circle cx={45} cy={45} r={36} fill="none" stroke={palette.slate100} strokeWidth={10} />
                <circle cx={45} cy={45} r={36} fill="none"
                  stroke={completionRate >= 70 ? palette.teal600 : palette.amber500}
                  strokeWidth={10}
                  strokeDasharray={`${circumference}`}
                  strokeDashoffset={`${circumference * (1 - completionRate / 100)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 45 45)"
                />
                <text x={45} y={50} textAnchor="middle" fontSize={15} fontWeight="800" fill={palette.slate900}>{completionRate}%</text>
              </svg>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: palette.teal600 }} />
                  <span style={{ fontSize: 12, color: palette.slate700 }}><b>{completedSessions}</b> completed</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: palette.slate300 }} />
                  <span style={{ fontSize: 12, color: palette.slate700 }}><b>{abandonedCount}</b> abandoned</span>
                </div>
              </div>
            </div>

            <div style={{
              background: completionRate >= 70 ? palette.teal50 : palette.amber50,
              border: `1px solid ${completionRate >= 70 ? palette.teal100 : "#fde68a"}`,
              borderRadius: 10, padding: "8px 12px",
              fontSize: 11, fontWeight: 600,
              color: completionRate >= 70 ? palette.teal700 : palette.amber500,
            }}>
              {completionRate >= 80
                ? "🔥 Excellent consistency — keep this up!"
                : completionRate >= 60
                  ? "📈 Good progress — try to reduce abandoned sessions."
                  : "💡 Shorter sessions can improve completion rate."}
            </div>
          </div>
        </div>

        {/* RECENT SESSIONS */}
        <div style={{ background: palette.white, border: `1px solid ${palette.slate200}`, borderRadius: 20, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: palette.teal700, display: "flex" }}><Icons.Calendar /></span>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: palette.slate800, margin: 0 }}>Recent Sessions</h3>
            </div>
            <span style={{ fontSize: 11, color: palette.slate400 }}>Last 6 sessions</span>
          </div>
          <SessionHistory sessions={recentSessions} palette={palette} />
        </div>

      </div>
    </div>
  );
}
