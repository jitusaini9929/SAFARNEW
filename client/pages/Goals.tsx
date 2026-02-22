import React, { useState, useMemo, useEffect } from "react";
import NishthaLayout from "@/components/NishthaLayout";
import { useTheme } from "@/contexts/ThemeContext";
import { dataService } from "@/utils/dataService";
import { Goal } from "@shared/api";
import { toast } from "sonner";

// ─── TYPES ────────────────────────────────────────────────────
interface UIGoal extends Goal {
    title: string;
}

const MAX_COMPLETED_DISPLAY = 5;

// ─── DESIGN TOKENS (matching Command Center palette exactly) ──
const T = {
    teal900: "#134e4a", teal800: "#115e59", teal700: "#0f766e",
    teal600: "#0d9488", teal500: "#14b8a6", teal400: "#2dd4bf",
    teal300: "#5eead4", teal200: "#99f6e4", teal100: "#ccfbf1", teal50: "#f0fdf9",
    maroon900: "#771d1d", maroon800: "#9b1c1c", maroon700: "#c81e1e",
    maroon600: "#e02424", maroon400: "#f98080", maroon200: "#fbd5d5", maroon100: "#fde8e8",
    slate900: "#0f172a", slate800: "#1e293b", slate700: "#334155",
    slate600: "#475569", slate500: "#64748b", slate400: "#94a3b8",
    slate300: "#cbd5e1", slate200: "#e2e8f0", slate100: "#f1f5f9", slate50: "#f8fafc",
    white: "#ffffff",
    indigo500: "#6366f1", indigo50: "#eef2ff",
    amber500: "#f59e0b", amber50: "#fffbeb",
    blue800: "#1e40af", blue50: "#eff6ff",
    // dark mode additions
    darkBg: "#0f172a", // slate900
    darkCard: "#1e293b", // slate800
    darkCardHover: "#334155", // slate700
    darkText: "#f8fafc", // slate50
    darkTextMuted: "#94a3b8", // slate400
    darkBorder: "#334155", // slate700
};

const IST_TIME_ZONE = "Asia/Kolkata";
const DAY_MS = 24 * 60 * 60 * 1000;

const formatISTDate = (date: Date, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { timeZone: IST_TIME_ZONE, ...options }).format(date);
const getISTDateKey = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: IST_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const year = parts.find(p => p.type === "year")?.value ?? "1970";
    const month = parts.find(p => p.type === "month")?.value ?? "01";
    const day = parts.find(p => p.type === "day")?.value ?? "01";
    return `${year}-${month}-${day}`;
};
const dateKeyToUtcDate = (dateKey: string) => new Date(`${dateKey}T00:00:00.000Z`);
const diffISTDays = (aKey: string, bKey: string) =>
    Math.round((dateKeyToUtcDate(aKey).getTime() - dateKeyToUtcDate(bKey).getTime()) / DAY_MS);

// ─── CONSTANTS ────────────────────────────────────────────────

// ─── HELPERS ─────────────────────────────────────────────────
const formatDate = (str?: string) => {
    if (!str) return "";
    const d = new Date(str);
    const dateKey = getISTDateKey(d);
    const todayKey = getISTDateKey(new Date());
    const diff = diffISTDays(dateKey, todayKey);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    if (diff > 0 && diff < 7) return formatISTDate(d, { weekday: "short", month: "short", day: "numeric" });
    return formatISTDate(d, { month: "short", day: "numeric", year: "numeric" });
};
const formatTime = (date?: Date | null) => {
    if (!date || !Number.isFinite(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
        timeZone: IST_TIME_ZONE,
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
};
const formatDuration = (ms?: number | null) => {
    if (!ms || !Number.isFinite(ms) || ms <= 0) return "";
    const totalMinutes = Math.round(ms / 60000);
    if (totalMinutes < 60) return `${totalMinutes}m`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
};
const getGoalDurationMs = (goal: UIGoal) => {
    if (!goal.completedAt) return null;
    const end = new Date(goal.completedAt);
    if (!Number.isFinite(end.getTime())) return null;
    const createdRaw = (goal as any).createdAt || (goal as any).created_at;
    const scheduledRaw = (goal as any).scheduledDate || (goal as any).scheduled_date;
    const createdAt = createdRaw ? new Date(createdRaw) : null;
    const scheduledAt = scheduledRaw ? new Date(scheduledRaw) : null;
    const candidates = [createdAt, scheduledAt].filter(
        (d): d is Date => !!d && Number.isFinite(d.getTime())
    );
    if (candidates.length === 0) return null;
    const start = candidates.reduce((latest, current) =>
        current.getTime() > latest.getTime() ? current : latest
    );
    if (end.getTime() < start.getTime()) return null;
    return end.getTime() - start.getTime();
};
const getGoalCreatedTime = (goal: UIGoal) => {
    const raw = (goal as any).createdAt || (goal as any).created_at || goal.scheduledDate;
    const created = raw ? new Date(raw) : null;
    return created && Number.isFinite(created.getTime()) ? created.getTime() : 0;
};
const getISTMinutesSinceMidnight = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: IST_TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(date);
    const hours = Number(parts.find(p => p.type === "hour")?.value ?? 0);
    const minutes = Number(parts.find(p => p.type === "minute")?.value ?? 0);
    return hours * 60 + minutes;
};
const formatTimeFromMinutes = (minutes?: number | null) => {
    if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return "";
    const total = Math.round(minutes);
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    const hour12 = hours % 12 || 12;
    const ampm = hours >= 12 ? "PM" : "AM";
    return `${hour12}:${String(mins).padStart(2, "0")} ${ampm}`;
};
const getDailyCompletionMetrics = (completedGoals: UIGoal[], dayKey: string) => {
    const dayGoals = completedGoals.filter(g => g.completedAt && getISTDateKey(new Date(g.completedAt)) === dayKey);
    const durations = dayGoals
        .map(getGoalDurationMs)
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0);
    const totalDuration = durations.reduce((sum, v) => sum + v, 0);
    const avgDuration = durations.length ? totalDuration / durations.length : 0;
    const completionMinutes = dayGoals
        .map(g => g.completedAt ? getISTMinutesSinceMidnight(new Date(g.completedAt)) : null)
        .filter((v): v is number => v !== null && Number.isFinite(v));
    const avgCompletionMinutes = completionMinutes.length
        ? completionMinutes.reduce((sum, v) => sum + v, 0) / completionMinutes.length
        : null;
    return { count: dayGoals.length, totalDuration, avgDuration, avgCompletionMinutes };
};
// ─── WEEK CHART ───────────────────────────────────────────────
const WeekChart = ({ goals }: { goals: UIGoal[] }) => {
    const todayKey = getISTDateKey(new Date());
    const base = dateKeyToUtcDate(todayKey);
    const data = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(base.getTime() - (6 - i) * DAY_MS);
        const ds = getISTDateKey(d);
        return {
            day: formatISTDate(d, { weekday: "short" })[0],
            count: goals.filter(g => g.completed && g.completedAt && getISTDateKey(new Date(g.completedAt)).startsWith(ds)).length,
        };
    });
    const max = Math.max(...data.map(d => d.count), 1);
    return (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 96 }}>
            {data.map((d, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
                    <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                        <div style={{
                            width: "100%", minHeight: d.count > 0 ? 8 : 3,
                            height: `${(d.count / max) * 100}%`,
                            background: d.count > 0 ? `linear-gradient(180deg,${T.teal400},${T.teal700})` : T.slate100,
                            borderRadius: "4px 4px 2px 2px", transition: "height 0.4s ease", position: "relative",
                        }}>
                            {d.count > 0 && <span style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", fontSize: 9, fontWeight: 700, color: T.teal700 }}>{d.count}</span>}
                        </div>
                    </div>
                    <span style={{ fontSize: 9, color: T.slate400, fontWeight: 700, textTransform: "uppercase" }}>{d.day}</span>
                </div>
            ))}
        </div>
    );
};

// ─── BADGE ───────────────────────────────────────────────────
// ─── GOAL CARD ────────────────────────────────────────────────
const GoalCard = ({ goal, onToggle, onDelete, onEdit, onRepeat, theme, isPhone, hideActions = false }: any) => {
    const isDark = theme === 'dark';
    const hoverBg = isDark ? T.darkCardHover : T.slate50;
    const textColor = isDark ? (goal.completed ? T.darkTextMuted : T.darkText) : (goal.completed ? T.slate400 : T.slate700);
    const metaColor = isDark ? T.darkTextMuted : T.slate400;

    const completedAt = goal.completedAt ? new Date(goal.completedAt) : null;
    const durationMs = getGoalDurationMs(goal);
    const completedDateLabel = completedAt ? formatDate(completedAt.toISOString()) : "";
    const completedTimeLabel = completedAt ? formatTime(completedAt) : "";
    const completedLabel = completedAt
        ? `Completed ${completedDateLabel}${completedTimeLabel ? ` · ${completedTimeLabel}` : ""}`
        : "Completed";
    const primaryMeta = goal.completed
        ? completedLabel
        : (goal.scheduledDate ? `Due ${formatDate(goal.scheduledDate)}` : "");
    const secondaryMeta = goal.completed && durationMs ? `Took ${formatDuration(durationMs)}` : "";

    return (
        <div style={{
            display: "flex", alignItems: "flex-start", gap: isPhone ? 10 : 12, padding: isPhone ? "12px" : "12px 14px",
            flexWrap: isPhone ? "wrap" : "nowrap",
            borderRadius: 14, transition: "background 0.15s",
            background: "transparent",
            opacity: goal.completed ? 0.72 : 1,
        }}
            onMouseOver={e => e.currentTarget.style.background = hoverBg}
            onMouseOut={e => e.currentTarget.style.background = "transparent"}
        >
            <div style={{ width: isPhone ? 34 : 40, height: isPhone ? 34 : 40, borderRadius: "50%", background: isDark ? "rgba(45, 212, 191, 0.18)" : T.teal50, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isPhone ? 15 : 18, flexShrink: 0, color: isDark ? T.teal400 : T.teal700 }}>
                {goal.completed ? "✓" : ""}
            </div>

            <div style={{ flex: 1, minWidth: 0, minHeight: isPhone ? 34 : undefined }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: isPhone ? 12 : 13, fontWeight: 600, color: textColor, textDecoration: goal.completed ? "line-through" : "none" }}>
                        {goal.title}
                    </span>
                </div>
                {goal.description && (
                    <p style={{ fontSize: isPhone ? 10 : 11, color: metaColor, margin: "0 0 6px", lineHeight: 1.45 }}>
                        {goal.description}
                    </p>
                )}
                {(primaryMeta || secondaryMeta) && (
                    <p style={{ fontSize: isPhone ? 10 : 11, color: metaColor, margin: 0, lineHeight: 1.45 }}>
                        {[primaryMeta, secondaryMeta].filter(Boolean).join(" · ")}
                    </p>
                )}
            </div>

            {!hideActions && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: isPhone ? "auto" : 0, width: isPhone ? "100%" : "auto", justifyContent: isPhone ? "flex-end" : "flex-start" }}>
                <button onClick={() => onRepeat(goal)} style={{ background: isDark ? "rgba(99, 102, 241, 0.1)" : T.indigo50, border: "none", borderRadius: 8, color: isDark ? T.indigo500 : T.indigo500, width: isPhone ? 60 : 44, height: isPhone ? 44 : 30, cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", minWidth: isPhone ? 60 : undefined }} title="Repeat">Repeat</button>
                <button onClick={() => onEdit(goal)} style={{ background: isDark ? "rgba(45, 212, 191, 0.1)" : T.teal50, border: "none", borderRadius: 8, color: isDark ? T.teal400 : T.teal700, width: isPhone ? 44 : 30, height: isPhone ? 44 : 30, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }} title="Edit">✎</button>
                <button onClick={() => onDelete(goal.id)} style={{ background: isDark ? "rgba(249, 128, 128, 0.1)" : T.maroon100, border: "none", borderRadius: 8, color: isDark ? T.maroon400 : T.maroon800, width: isPhone ? 44 : 30, height: isPhone ? 44 : 30, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }} title="Delete">✕</button>
                <button
                    onClick={goal.completed ? undefined : () => onToggle(goal.id, goal.completed)}
                    style={{
                        width: isPhone ? 44 : 28, height: isPhone ? 44 : 28, borderRadius: "50%",
                        border: `2px solid ${goal.completed ? T.teal600 : T.slate300}`,
                        background: goal.completed ? T.teal600 : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: goal.completed ? "default" : "pointer", flexShrink: 0, transition: "all 0.15s",
                        opacity: goal.completed ? 0.85 : 1,
                    }}
                    title={goal.completed ? "Completed" : "Mark as done"}
                    aria-disabled={goal.completed}
                >
                    {goal.completed && <span style={{ color: T.white, fontSize: 14, fontWeight: 900 }}>✓</span>}
                </button>
            </div>
            )}
        </div>
    );
};

// ─── MODAL ────────────────────────────────────────────────────
const GoalModal = ({ goal, mode, onSave, onClose, theme, isPhone, todayKey, maxDateKey }: any) => {
    const isDark = theme === 'dark';
    const isEdit = mode === "edit";
    const isRepeat = mode === "repeat";
    const initialDateKey = useMemo(
        () => (goal?.scheduledDate ? getISTDateKey(new Date(goal.scheduledDate)) : todayKey),
        [goal?.scheduledDate, todayKey]
    );
    const [title, setTitle] = useState(goal?.title || "");
    const [desc, setDesc] = useState(goal?.description || "");
    const [date, setDate] = useState(initialDateKey);

    useEffect(() => {
        setTitle(goal?.title || "");
        setDesc(goal?.description || "");
        setDate(initialDateKey);
    }, [goal?.title, goal?.description, initialDateKey]);

    const submit = () => {
        if (!title.trim()) return;
        if (date < todayKey && (!isEdit || date !== initialDateKey)) {
            toast.error("Please choose today or a future date.");
            setDate(todayKey);
            return;
        }
        if (date > maxDateKey && (!isEdit || date !== initialDateKey)) {
            toast.error("Please choose a date within the next 7 days.");
            setDate(maxDateKey);
            return;
        }
        onSave({ title: title.trim(), description: desc.trim(), scheduledDate: date });
    };

    useEffect(() => {
        if (date < todayKey && (!isEdit || date !== initialDateKey)) {
            setDate(todayKey);
            return;
        }
        if (date > maxDateKey && (!isEdit || date !== initialDateKey)) {
            setDate(maxDateKey);
        }
    }, [date, todayKey, maxDateKey, isEdit, initialDateKey]);

    const inp = { width: "100%", background: isDark ? T.darkCardHover : T.slate50, border: `1px solid ${isDark ? T.darkBorder : T.slate200}`, colorScheme: isDark ? 'dark' : 'light', borderRadius: 10, padding: "9px 12px", color: isDark ? T.darkText : T.slate800, fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" as any };
    const lbl = { fontSize: 10, color: isDark ? T.maroon400 : T.maroon400, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as any, marginBottom: 5, display: "block" };

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.65)", display: "flex", alignItems: isPhone ? "flex-end" : "center", justifyContent: "center", zIndex: 1000, padding: isPhone ? 0 : 20, overflowY: isPhone ? "auto" : "hidden" }}>
            <div style={{ background: isDark ? T.darkCard : T.white, borderRadius: isPhone ? "20px 20px 0 0" : 24, width: "100%", maxWidth: 480, height: isPhone ? "90dvh" : "auto", maxHeight: isPhone ? "90dvh" : "85vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 60px rgba(0,0,0,0.2)", overflowX: "hidden" }}>
                <div style={{ flexShrink: 0, background: `linear-gradient(135deg,${T.maroon800},${T.maroon900})`, padding: isPhone ? "16px 14px" : "20px 24px", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, background: T.maroon600, borderRadius: "50%", opacity: 0.2, filter: "blur(20px)" }} />
                    <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h2 style={{ color: T.white, fontSize: 17, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                            {isEdit ? "Edit Goal" : isRepeat ? "Repeat Goal" : "New Goal"}
                        </h2>
                        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: T.white, fontSize: 15, cursor: "pointer", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                    </div>
                </div>

                <div style={{ flex: 1, minHeight: 0, padding: isPhone ? "16px 14px 40px" : "22px 24px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" as any }}>
                    <div style={{ flexShrink: 0 }}>
                        <label style={lbl}>Title *</label>
                        <input style={inp} placeholder="e.g. Study 2 hours: Algebra Revision" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
                    </div>
                    <div style={{ flexShrink: 0 }}>
                        <label style={lbl}>Description (optional)</label>
                        <textarea style={{ ...inp, resize: "vertical", minHeight: 80 }} placeholder="Add details or context..." value={desc} onChange={e => setDesc(e.target.value)} />
                    </div>
                    <div style={{ flexShrink: 0 }}>
                        <label style={lbl}>Date</label>
                        <input type="date" style={inp} value={date} onChange={e => setDate(e.target.value)} min={todayKey} max={maxDateKey} />
                    </div>

                    <button
                        onClick={submit}
                        disabled={!title.trim()}
                        style={{
                            marginTop: "10px",
                            background: title.trim() ? `linear-gradient(135deg,${T.maroon700},${T.maroon900})` : T.slate100,
                            border: "none", borderRadius: 12, color: title.trim() ? T.white : T.slate400,
                            padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: title.trim() ? "pointer" : "not-allowed",
                            width: "100%", letterSpacing: "0.02em", transition: "all 0.2s",
                            boxShadow: title.trim() ? "0 4px 14px rgba(155,28,28,0.3)" : "none",
                            flexShrink: 0
                        }}
                    >
                        {isEdit ? "Save Changes" : isRepeat ? "Repeat Goal" : "Create Goal"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── ANALYTICS ────────────────────────────────────────────────
const Analytics = ({ goals, theme, isPhone, isTablet }: { goals: UIGoal[], theme: string, isPhone: boolean, isTablet: boolean }) => {
    const isDark = theme === 'dark';
    const completedGoals = goals.filter(g => g.completed && g.completedAt);
    const todayKey = getISTDateKey(new Date());
    const base = dateKeyToUtcDate(todayKey);

    const days = Array.from({ length: 7 }, (_, i) => {
        const dayDate = new Date(base.getTime() - (6 - i) * DAY_MS);
        const key = getISTDateKey(dayDate);
        const dayGoals = completedGoals.filter(g => g.completedAt && getISTDateKey(new Date(g.completedAt)) === key);
        const durations = dayGoals
            .map(getGoalDurationMs)
            .filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0);
        const totalDuration = durations.reduce((sum, v) => sum + v, 0);
        const avgDuration = durations.length ? totalDuration / durations.length : 0;
        const completionMinutes = dayGoals
            .map(g => g.completedAt ? getISTMinutesSinceMidnight(new Date(g.completedAt)) : null)
            .filter((v): v is number => v !== null && Number.isFinite(v));
        const avgCompletionMinutes = completionMinutes.length
            ? completionMinutes.reduce((sum, v) => sum + v, 0) / completionMinutes.length
            : null;

        return {
            key,
            label: formatISTDate(dayDate, { weekday: "short" }),
            count: dayGoals.length,
            totalDuration,
            avgDuration,
            avgCompletionMinutes,
        };
    });

    const totalCompleted = completedGoals.length;
    const totalDuration = days.reduce((sum, d) => sum + d.totalDuration, 0);
    const avgDuration = totalCompleted ? totalDuration / totalCompleted : 0;
    const allCompletionMinutes = completedGoals
        .map(g => g.completedAt ? getISTMinutesSinceMidnight(new Date(g.completedAt)) : null)
        .filter((v): v is number => v !== null && Number.isFinite(v));
    const avgCompletionMinutes = allCompletionMinutes.length
        ? allCompletionMinutes.reduce((sum, v) => sum + v, 0) / allCompletionMinutes.length
        : null;
    const avgDurationLabel = totalCompleted ? (formatDuration(avgDuration) || "0m") : "—";
    const avgCompletionLabel = avgCompletionMinutes !== null ? formatTimeFromMinutes(avgCompletionMinutes) : "—";
    const totalDurationLabel = totalDuration ? formatDuration(totalDuration) : "—";

    return (
        <div style={{ display: "grid", gridTemplateColumns: isTablet ? "1fr" : "1fr 340px", gap: isPhone ? 14 : 24, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr 1fr", gap: 12 }}>
                    {[
                        ["Completed (7d)", String(totalCompleted), T.teal700],
                        ["Avg Duration", avgDurationLabel, T.indigo500],
                        ["Avg Completion Time", avgCompletionLabel, T.maroon800],
                        ["Total Duration", totalDurationLabel, T.teal700],
                    ].map(([label, val, col]) => (
                        <div key={label} style={{ background: isDark ? T.darkCard : T.white, borderRadius: 16, padding: isPhone ? "14px 16px" : "16px 18px", border: `1px solid ${isDark ? T.darkBorder : T.slate200}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                <span style={{ fontSize: 10, color: isDark ? T.darkTextMuted : T.slate500, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
                            </div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: col }}>{val}</div>
                        </div>
                    ))}
                </div>

                <div style={{ background: isDark ? T.darkCard : T.white, borderRadius: 20, padding: 20, border: `1px solid ${isDark ? T.darkBorder : T.slate200}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: isDark ? T.darkText : T.slate800 }}>History</span>
                        <span style={{ fontSize: 11, color: isDark ? T.darkTextMuted : T.slate400 }}>Last 7 Days</span>
                    </div>
                    <WeekChart goals={goals} />
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${isDark ? T.darkBorder : T.slate100}`, display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13, color: isDark ? T.darkTextMuted : T.slate500 }}>Goals Completed</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? T.teal400 : T.teal700 }}>{totalCompleted}</span>
                    </div>
                </div>
            </div>

            <div style={{ background: isDark ? T.darkCard : T.white, borderRadius: 20, padding: 20, border: `1px solid ${isDark ? T.darkBorder : T.slate200}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: isDark ? T.darkText : T.slate800, margin: "0 0 16px" }}>Daily Breakdown</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {days.map(day => (
                        <div key={day.key} style={{ display: "grid", gridTemplateColumns: isPhone ? "1fr" : "90px 1fr 1fr 1fr", gap: 6, padding: "8px 10px", borderRadius: 12, background: isDark ? T.darkCardHover : T.slate50 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? T.darkText : T.slate700 }}>{day.label}</span>
                            <span style={{ fontSize: 11, color: isDark ? T.darkTextMuted : T.slate500 }}>{day.count} completed</span>
                            <span style={{ fontSize: 11, color: isDark ? T.darkTextMuted : T.slate500 }}>{day.count ? (formatDuration(day.totalDuration) || "0m") : "—"} total</span>
                            <span style={{ fontSize: 11, color: isDark ? T.darkTextMuted : T.slate500 }}>{day.avgCompletionMinutes !== null ? formatTimeFromMinutes(day.avgCompletionMinutes) : "—"}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─── MAIN ─────────────────────────────────────────────────────
export default function Goals() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [todayKey, setTodayKey] = useState(() => getISTDateKey(new Date()));
    const maxDateKey = useMemo(() => {
        const base = dateKeyToUtcDate(todayKey);
        return getISTDateKey(new Date(base.getTime() + 7 * DAY_MS));
    }, [todayKey]);
    const [viewportWidth, setViewportWidth] = useState(
        typeof window !== "undefined" ? window.innerWidth : 1280
    );
    const [goals, setGoals] = useState<UIGoal[]>([]);
    const [modal, setModal] = useState<any>(null);
    const [tab, setTab] = useState("goals");
    const getErrorMessage = (error: unknown, fallback: string) =>
        error instanceof Error && error.message ? error.message : fallback;
    const getScheduledKey = (g: UIGoal) => g.scheduledDate ? getISTDateKey(new Date(g.scheduledDate)) : null;

    const fetchGoals = async () => {
        try {
            const res = await dataService.getGoals();
            const data: UIGoal[] = (res || []).map(g => ({
                ...g,
                title: g.title || g.text || '',
            }));
            setGoals(data);
        } catch (error) {
            console.error(error);
            toast.error(getErrorMessage(error, "Failed to load goals"));
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setTodayKey(getISTDateKey(new Date()));
        }, 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => { fetchGoals(); }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const onResize = () => setViewportWidth(window.innerWidth);
        onResize();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const toggleGoal = async (id: string, currentCompleted: boolean) => {
        if (currentCompleted) {
            toast.info("Completed goals stay completed. Edit to plan it again.");
            return;
        }

        const nowIso = new Date().toISOString();
        setGoals(gs => gs.map(g =>
            g.id !== id ? g : { ...g, completed: true, completedAt: nowIso }
        ));
        try {
            await dataService.updateGoal(id, true, nowIso);
            toast.success("Goal completed!");
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to update goal"));
            fetchGoals();
        }
    };

    const deleteGoal = async (id: string) => {
        setGoals(gs => gs.filter(g => g.id !== id));
        try {
            await dataService.deleteGoal(id);
            toast.success("Goal deleted");
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to delete goal"));
            fetchGoals();
        }
    };

    const saveGoal = async (data: any) => {
        if (modal?.mode === "edit") {
            const scheduleChanged = getScheduledKey(modal.goal) !== data.scheduledDate;
            const shouldRepeat = modal.goal.completed && scheduleChanged;

            setModal(null);
            if (shouldRepeat) {
                try {
                    await dataService.addGoal({
                        title: data.title,
                        type: "daily",
                        scheduledDate: data.scheduledDate,
                        description: data.description,
                    });
                    toast.success(`Goal copied to ${formatDate(data.scheduledDate)}`);
                    fetchGoals();
                } catch (error) {
                    toast.error(getErrorMessage(error, "Creation failed"));
                    fetchGoals();
                }
                return;
            }

            try {
                await dataService.updateGoalDetails(modal.goal.id, {
                    title: data.title,
                    description: data.description,
                });

                if (scheduleChanged) {
                    await dataService.rescheduleGoal(modal.goal.id, new Date(data.scheduledDate));
                }

                toast.success("Goal updated");
                fetchGoals();
            } catch (error) { toast.error(getErrorMessage(error, "Update failed")); fetchGoals(); }
        } else {
            setModal(null);
            try {
                await dataService.addGoal({
                    title: data.title,
                    type: "daily",
                    scheduledDate: data.scheduledDate,
                    description: data.description,
                });
                toast.success(modal?.mode === "repeat" ? "Goal repeated" : "Goal created");
                fetchGoals();
            } catch (error) { toast.error(getErrorMessage(error, "Creation failed")); fetchGoals(); }
        }
    };

    const pendingGoals = useMemo(() => (
        goals.filter(g => !g.completed).sort((a, b) => {
            const aKey = getScheduledKey(a) || "9999-12-31";
            const bKey = getScheduledKey(b) || "9999-12-31";
            return aKey < bKey ? -1 : 1;
        })
    ), [goals]);

    const completedGoals = useMemo(() => (
        goals.filter(g => g.completed).sort((a, b) => {
            const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
            const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
            return bTime - aTime;
        })
    ), [goals]);
    const completedGoalsDisplay = useMemo(
        () => completedGoals.slice(0, MAX_COMPLETED_DISPLAY),
        [completedGoals]
    );
    const historyGoals = useMemo(() => (
        [...goals].sort((a, b) => getGoalCreatedTime(a) - getGoalCreatedTime(b))
    ), [goals]);

    const todayMetrics = useMemo(() => getDailyCompletionMetrics(completedGoals, todayKey), [completedGoals, todayKey]);
    const weekKeys = useMemo(() => (
        Array.from({ length: 7 }, (_, i) => {
            const d = new Date(dateKeyToUtcDate(todayKey).getTime() - (6 - i) * DAY_MS);
            return getISTDateKey(d);
        })
    ), [todayKey]);
    const weekGoals = useMemo(() => (
        completedGoals.filter(g => g.completedAt && weekKeys.includes(getISTDateKey(new Date(g.completedAt))))
    ), [completedGoals, weekKeys]);
    const weekDuration = weekGoals
        .map(getGoalDurationMs)
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0)
        .reduce((sum, v) => sum + v, 0);

    const isPhone = viewportWidth < 640;
    const isTablet = viewportWidth < 1024;
    const contentGrid = isTablet ? "1fr" : "1fr 340px";
    const pagePadding = isPhone ? "16px 12px 24px" : isTablet ? "22px 16px 28px" : "28px 20px";

    return (
        <NishthaLayout>
            <div style={{ minHeight: "100vh", background: isDark ? T.darkBg : T.slate50, fontFamily: "'Plus Jakarta Sans',sans-serif", color: isDark ? T.darkText : T.slate800, width: "100%", transition: "background 0.3s ease", overflowX: "hidden" }}>
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

                <div style={{ maxWidth: 1200, margin: "0 auto", padding: pagePadding, width: "100%", boxSizing: "border-box" }}>
                    <header style={{ display: "flex", justifyContent: "space-between", alignItems: isPhone ? "stretch" : "flex-start", marginBottom: isPhone ? 18 : 28, gap: isPhone ? 12 : 16, flexDirection: isPhone ? "column" : "row" }}>
                        <div>
                            <h1 style={{ fontSize: isPhone ? 22 : 26, fontWeight: 800, color: isDark ? T.darkText : T.slate900, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
                                Command Center
                            </h1>
                            <p style={{ fontSize: isPhone ? 12 : 13, color: isDark ? T.darkTextMuted : T.slate500, margin: "4px 0 0" }}>Manage your goals and track progress efficiently.</p>
                        </div>
                        <button
                            onClick={() => setModal({ mode: "add", goal: null })}
                            style={{ background: `linear-gradient(135deg,${T.maroon800},${T.maroon900})`, border: "none", borderRadius: 12, color: T.white, padding: isPhone ? "14px 20px" : "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(155,28,28,0.28)", width: isPhone ? "100%" : "auto" }}
                        >
                            ＋ New Goal
                        </button>
                    </header>

                    <div style={{ display: "flex", gap: 4, marginBottom: isPhone ? 16 : 24, background: isDark ? T.darkCard : T.white, borderRadius: 12, padding: 4, width: isPhone ? "100%" : "fit-content", border: `1px solid ${isDark ? T.darkBorder : T.slate200}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                        {[["goals", "Goals"], ["analytics", "Analytics"]].map(([k, l]) => (
                            <button key={k} onClick={() => setTab(k)} style={{
                                background: tab === k ? `linear-gradient(135deg,${T.teal800},${T.teal900})` : "transparent",
                                border: "none", borderRadius: 10, color: tab === k ? T.white : (isDark ? T.darkTextMuted : T.slate500),
                                padding: isPhone ? "12px 18px" : "7px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", flex: isPhone ? 1 : undefined,
                                boxShadow: tab === k ? "0 2px 8px rgba(17,94,89,0.3)" : "none",
                            }}>{l}</button>
                        ))}
                    </div>

                    {tab === "analytics" ? <Analytics goals={goals} theme={theme} isPhone={isPhone} isTablet={isTablet} /> : (
                        <div style={{ display: "grid", gridTemplateColumns: contentGrid, gap: isPhone ? 14 : 24, alignItems: "start" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: isPhone ? 14 : 20 }}>
                                <div style={{ background: isDark ? T.darkCard : T.white, borderRadius: isPhone ? 18 : 24, border: `1px solid ${isDark ? T.darkBorder : T.slate200}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden" }}>
                                    <div style={{ padding: isPhone ? "14px 12px" : "16px 20px", borderBottom: `1px solid ${isDark ? T.darkBorder : T.slate100}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <h3 style={{ fontSize: 15, fontWeight: 700, color: isDark ? T.darkText : T.slate800, margin: 0 }}>Pending</h3>
                                            <span style={{ background: isDark ? T.darkCardHover : T.slate100, color: isDark ? T.darkTextMuted : T.slate600, fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 8 }}>{pendingGoals.length}</span>
                                        </div>
                                    </div>

                                    {pendingGoals.length === 0 ? (
                                        <div style={{ textAlign: "center", padding: "32px 20px", color: isDark ? T.darkTextMuted : T.slate400 }}>
                                            <div style={{ fontSize: 14, fontWeight: 600 }}>No pending goals.</div>
                                        </div>
                                    ) : (
                                        <div>
                                            {pendingGoals.map((g, i) => (
                                                <div key={g.id} style={{ borderBottom: i < pendingGoals.length - 1 ? `1px solid ${isDark ? T.darkBorder : T.slate50}` : "none" }}>
                                                    <GoalCard theme={theme} isPhone={isPhone} goal={g} onToggle={toggleGoal} onDelete={deleteGoal} onEdit={(goal: any) => setModal({ mode: "edit", goal })} onRepeat={(goal: any) => setModal({ mode: "repeat", goal })} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div style={{ background: isDark ? T.darkCard : T.white, borderRadius: isPhone ? 18 : 24, border: `1px solid ${isDark ? T.darkBorder : T.slate200}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden" }}>
                                    <div style={{ padding: isPhone ? "14px 12px" : "16px 20px", borderBottom: `1px solid ${isDark ? T.darkBorder : T.slate100}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <h3 style={{ fontSize: 15, fontWeight: 700, color: isDark ? T.darkText : T.slate800, margin: 0 }}>Recent</h3>
                                            <span style={{ background: isDark ? T.darkCardHover : T.slate100, color: isDark ? T.darkTextMuted : T.slate600, fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 8 }}>{completedGoalsDisplay.length}</span>
                                        </div>
                                    </div>

                                    {completedGoalsDisplay.length === 0 ? (
                                        <div style={{ textAlign: "center", padding: "32px 20px", color: isDark ? T.darkTextMuted : T.slate400 }}>
                                            <div style={{ fontSize: 14, fontWeight: 600 }}>No completed goals yet.</div>
                                        </div>
                                    ) : (
                                        <div>
                                            {completedGoalsDisplay.map((g, i) => (
                                                <div key={g.id} style={{ borderBottom: i < completedGoalsDisplay.length - 1 ? `1px solid ${isDark ? T.darkBorder : T.slate50}` : "none" }}>
                                                    <GoalCard theme={theme} isPhone={isPhone} goal={g} onToggle={toggleGoal} onDelete={deleteGoal} onEdit={(goal: any) => setModal({ mode: "edit", goal })} onRepeat={(goal: any) => setModal({ mode: "repeat", goal })} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div style={{ background: isDark ? T.darkCard : T.white, borderRadius: isPhone ? 18 : 24, border: `1px solid ${isDark ? T.darkBorder : T.slate200}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden" }}>
                                    <div style={{ padding: isPhone ? "14px 12px" : "16px 20px", borderBottom: `1px solid ${isDark ? T.darkBorder : T.slate100}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <h3 style={{ fontSize: 15, fontWeight: 700, color: isDark ? T.darkText : T.slate800, margin: 0 }}>Goal History</h3>
                                            <span style={{ background: isDark ? T.darkCardHover : T.slate100, color: isDark ? T.darkTextMuted : T.slate600, fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 8 }}>{historyGoals.length}</span>
                                        </div>
                                        <span style={{ fontSize: 11, color: isDark ? T.darkTextMuted : T.slate500 }}>Oldest → Newest</span>
                                    </div>

                                    {historyGoals.length === 0 ? (
                                        <div style={{ textAlign: "center", padding: "32px 20px", color: isDark ? T.darkTextMuted : T.slate400 }}>
                                            <div style={{ fontSize: 14, fontWeight: 600 }}>No goals yet.</div>
                                        </div>
                                    ) : (
                                        <div style={{ maxHeight: isPhone ? 280 : 360, overflowY: "auto" }}>
                                            {historyGoals.map((g, i) => (
                                                <div key={g.id} style={{ borderBottom: i < historyGoals.length - 1 ? `1px solid ${isDark ? T.darkBorder : T.slate50}` : "none" }}>
                                                    <GoalCard theme={theme} isPhone={isPhone} goal={g} onToggle={toggleGoal} onDelete={deleteGoal} onEdit={(goal: any) => setModal({ mode: "edit", goal })} onRepeat={(goal: any) => setModal({ mode: "repeat", goal })} hideActions />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: isPhone ? 14 : 18 }}>
                                <div style={{ background: isDark ? T.darkCard : T.white, border: `1px solid ${isDark ? T.darkBorder : T.slate200}`, borderRadius: isPhone ? 16 : 20, padding: isPhone ? 14 : 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                                    <h3 style={{ fontSize: 13, fontWeight: 700, color: isDark ? T.darkText : T.slate800, margin: "0 0 14px" }}>
                                        Today
                                    </h3>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                        <span style={{ fontSize: 12, color: isDark ? T.darkTextMuted : T.slate500 }}>Completed</span>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? T.teal400 : T.teal700 }}>{todayMetrics.count}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                        <span style={{ fontSize: 12, color: isDark ? T.darkTextMuted : T.slate500 }}>Total Duration</span>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? T.teal400 : T.teal700 }}>{todayMetrics.count ? (formatDuration(todayMetrics.totalDuration) || "0m") : "—"}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ fontSize: 12, color: isDark ? T.darkTextMuted : T.slate500 }}>Avg Completion Time</span>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? T.teal400 : T.teal700 }}>{todayMetrics.count ? (todayMetrics.avgCompletionMinutes !== null ? formatTimeFromMinutes(todayMetrics.avgCompletionMinutes) : "—") : "—"}</span>
                                    </div>
                                </div>

                                <div style={{ background: isDark ? T.darkCard : T.white, border: `1px solid ${isDark ? T.darkBorder : T.slate200}`, borderRadius: isPhone ? 16 : 20, padding: isPhone ? 14 : 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: isDark ? T.darkText : T.slate800 }}>Last 7 Days</span>
                                        <span style={{ fontSize: 11, color: isDark ? T.darkTextMuted : T.slate400 }}>Completion count</span>
                                    </div>
                                    <WeekChart goals={goals} />
                                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${isDark ? T.darkBorder : T.slate100}`, display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ fontSize: 13, color: isDark ? T.darkTextMuted : T.slate500 }}>Completed</span>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? T.teal400 : T.teal700 }}>{weekGoals.length}</span>
                                    </div>
                                    <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ fontSize: 13, color: isDark ? T.darkTextMuted : T.slate500 }}>Total Duration</span>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? T.teal400 : T.teal700 }}>{weekGoals.length ? (formatDuration(weekDuration) || "0m") : "—"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                {modal && <GoalModal theme={theme} isPhone={isPhone} goal={modal.goal || null} mode={modal.mode} onSave={saveGoal} onClose={() => setModal(null)} todayKey={todayKey} maxDateKey={maxDateKey} />}
            </div>
        </NishthaLayout>
    );
}
