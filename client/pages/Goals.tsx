import React, { useState, useMemo, useEffect } from "react";
import NishthaLayout from "@/components/NishthaLayout";
import { useTheme } from "@/contexts/ThemeContext";
import { dataService } from "@/utils/dataService";
import { Goal } from "@shared/api";
import { toast } from "sonner";

// ─── TYPES ────────────────────────────────────────────────────
type GoalCategory = "academic" | "health" | "personal" | "other";
type GoalPriority = "high" | "medium" | "low";

interface Subtask {
    id: string;
    text: string;
    done: boolean;
}

interface UIGoal extends Goal {
    category: GoalCategory;
    priority: GoalPriority;
    subtasks: Subtask[];
    title: string;
}

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

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const toISTDate = (date: Date) => new Date(date.getTime() + IST_OFFSET_MS);
const getISTDateKey = (date: Date) => toISTDate(date).toISOString().split("T")[0];
const dateKeyToUtcDate = (dateKey: string) => new Date(`${dateKey}T00:00:00.000Z`);
const diffISTDays = (aKey: string, bKey: string) =>
    Math.round((dateKeyToUtcDate(aKey).getTime() - dateKeyToUtcDate(bKey).getTime()) / DAY_MS);

const today = new Date();
const todayStr = getISTDateKey(today);
const maxDate = new Date(today.getTime() + 7 * DAY_MS);
const maxDateStr = getISTDateKey(maxDate);

// ─── CONSTANTS ────────────────────────────────────────────────
const CATEGORIES = [
    { value: "academic", label: "Study & Learning", emoji: "", color: T.teal700, bg: T.teal50 },
    { value: "health", label: "Physical Health", emoji: "", color: T.maroon800, bg: T.maroon100 },
    { value: "personal", label: "Mindfulness", emoji: "", color: T.indigo500, bg: T.indigo50 },
    { value: "other", label: "Other", emoji: "", color: T.amber500, bg: T.amber50 },
];
const PRIORITIES = [
    { value: "high", label: "High", color: "#dc2626", bg: "#fee2e2" },
    { value: "medium", label: "Medium", color: T.amber500, bg: "#fef3c7" },
    { value: "low", label: "Low", color: T.slate500, bg: T.slate100 },
];
const TYPES = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
];

const getCat = (v: string) => CATEGORIES.find(c => c.value === v) || CATEGORIES[3];
const getPri = (v: string) => PRIORITIES.find(p => p.value === v) || PRIORITIES[1];
const uniqueId = () => Math.random().toString(36).slice(2, 10);

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
    const istDate = toISTDate(d);
    if (diff > 0 && diff < 7) return istDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    return istDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const isOverdue = (g: UIGoal) => {
    if (g.completed || !g.scheduledDate) return false;
    const scheduledKey = getISTDateKey(new Date(g.scheduledDate));
    const todayKey = getISTDateKey(new Date());
    return scheduledKey < todayKey;
};

// ─── WEEK CHART ───────────────────────────────────────────────
const WeekChart = ({ goals }: { goals: UIGoal[] }) => {
    const todayKey = getISTDateKey(new Date());
    const base = dateKeyToUtcDate(todayKey);
    const data = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(base.getTime() - (6 - i) * DAY_MS);
        const ds = getISTDateKey(d);
        return {
            day: toISTDate(d).toLocaleDateString("en-US", { weekday: "short" })[0],
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
const Badge = ({ label, color, bg }: { label: string, color: string, bg: string }) => (
    <span style={{ color, background: bg, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 20, letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
        {label}
    </span>
);

// ─── GOAL CARD ────────────────────────────────────────────────
const GoalCard = ({ goal, onToggle, onDelete, onEdit, onToggleSubtask, theme, isPhone }: any) => {
    const isDark = theme === 'dark';
    const [expanded, setExpanded] = useState(false);
    const cat = getCat(goal.category);
    const pri = getPri(goal.priority);
    const overdue = isOverdue(goal);
    const hasSubs = goal.subtasks.length > 0;
    const subsDone = goal.subtasks.filter((s: any) => s.done).length;

    const hoverBg = isDark ? T.darkCardHover : T.slate50;
    const textColor = isDark ? (goal.completed ? T.darkTextMuted : T.darkText) : (goal.completed ? T.slate400 : T.slate700);
    const subTextColor = isDark ? (goal.completed ? T.slate600 : T.darkTextMuted) : (goal.completed ? T.slate400 : T.slate600);
    const badgeBg = isDark ? T.darkCardHover : T.slate100;
    const badgeText = isDark ? T.slate300 : T.slate600;

    return (
        <div style={{
            display: "flex", alignItems: "flex-start", gap: isPhone ? 10 : 12, padding: isPhone ? "12px" : "12px 14px",
            flexWrap: isPhone ? "wrap" : "nowrap",
            borderRadius: 14, transition: "background 0.15s",
            background: "transparent",
            opacity: goal.completed ? 0.65 : 1,
        }}
            onMouseOver={e => e.currentTarget.style.background = hoverBg}
            onMouseOut={e => e.currentTarget.style.background = "transparent"}
        >
            <div style={{ width: isPhone ? 34 : 40, height: isPhone ? 34 : 40, borderRadius: "50%", background: isDark ? cat.color + "33" : cat.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isPhone ? 15 : 18, flexShrink: 0 }}>
                {cat.emoji}
            </div>

            <div style={{ flex: 1, minWidth: 0, minHeight: isPhone ? 34 : undefined }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: pri.color, display: "inline-block", flexShrink: 0 }} />
                    <span style={{ fontSize: isPhone ? 12 : 13, fontWeight: 600, color: textColor, textDecoration: goal.completed ? "line-through" : "none" }}>
                        {goal.title}
                    </span>
                </div>
                <p style={{ fontSize: isPhone ? 10 : 11, color: isDark ? T.darkTextMuted : T.slate400, margin: "0 0 6px", lineHeight: 1.45 }}>
                    {cat.label}
                    {goal.description ? " · " + goal.description : ""}
                    {goal.scheduledDate ? " · " + (overdue ? "⚠ Overdue" : formatDate(goal.scheduledDate)) : ""}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Badge label={pri.label} color={pri.color} bg={isDark ? pri.color + "22" : pri.bg} />
                    <Badge label={TYPES.find(t => t.value === goal.type)?.label || goal.type} color={badgeText} bg={badgeBg} />
                    {hasSubs && (
                        <button onClick={() => setExpanded(e => !e)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: T.teal600, fontWeight: 600, padding: 0 }}>
                            {subsDone}/{goal.subtasks.length} steps {expanded ? "▲" : "▼"}
                        </button>
                    )}
                </div>
                {expanded && hasSubs && (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
                        {goal.subtasks.map((sub: any) => (
                            <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <button
                                    onClick={() => onToggleSubtask(goal.id, sub.id)}
                                    style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${sub.done ? T.teal700 : T.slate300}`, background: sub.done ? T.teal700 : "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                                >
                                    {sub.done && <span style={{ color: T.white, fontSize: 8, fontWeight: 900 }}>✓</span>}
                                </button>
                                <span style={{ fontSize: 11, color: subTextColor, textDecoration: sub.done ? "line-through" : "none" }}>{sub.text}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: isPhone ? "auto" : 0, width: isPhone ? "100%" : "auto", justifyContent: isPhone ? "flex-end" : "flex-start" }}>
                <button onClick={() => onEdit(goal)} style={{ background: isDark ? "rgba(45, 212, 191, 0.1)" : T.teal50, border: "none", borderRadius: 8, color: isDark ? T.teal400 : T.teal700, width: isPhone ? 30 : 26, height: isPhone ? 30 : 26, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }} title="Edit">✎</button>
                <button onClick={() => onDelete(goal.id)} style={{ background: isDark ? "rgba(249, 128, 128, 0.1)" : T.maroon100, border: "none", borderRadius: 8, color: isDark ? T.maroon400 : T.maroon800, width: isPhone ? 30 : 26, height: isPhone ? 30 : 26, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }} title="Delete">✕</button>
                <button
                    onClick={() => onToggle(goal.id, goal.completed)}
                    style={{
                        width: isPhone ? 28 : 24, height: isPhone ? 28 : 24, borderRadius: "50%",
                        border: `2px solid ${goal.completed ? T.teal600 : T.slate300}`,
                        background: goal.completed ? T.teal600 : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
                    }}
                >
                    {goal.completed && <span style={{ color: T.white, fontSize: 10, fontWeight: 900 }}>✓</span>}
                </button>
            </div>
        </div>
    );
};

// ─── MODAL ────────────────────────────────────────────────────
const GoalModal = ({ goal, onSave, onClose, theme, isPhone }: any) => {
    const isDark = theme === 'dark';
    const isEdit = !!goal?.id;
    const [title, setTitle] = useState(goal?.title || "");
    const [desc, setDesc] = useState(goal?.description || "");
    const [category, setCategory] = useState(goal?.category || "academic");
    const [priority, setPriority] = useState(goal?.priority || "medium");
    const [type, setType] = useState(goal?.type === "weekly" ? "weekly" : "daily");
    const [date, setDate] = useState(goal?.scheduledDate ? getISTDateKey(new Date(goal.scheduledDate)) : todayStr);
    const [subtasks, setSubtasks] = useState<Subtask[]>(goal?.subtasks || []);
    const [newSub, setNewSub] = useState("");

    const addSub = () => { if (!newSub.trim()) return; setSubtasks(s => [...s, { id: uniqueId(), text: newSub.trim(), done: false }]); setNewSub(""); };
    const removeSub = (id: string) => setSubtasks(s => s.filter(x => x.id !== id));
    const submit = () => { if (!title.trim()) return; onSave({ title: title.trim(), description: desc.trim(), category, priority, type, scheduledDate: date, subtasks }); };

    const inp = { width: "100%", background: isDark ? T.darkCardHover : T.slate50, border: `1px solid ${isDark ? T.darkBorder : T.slate200}`, colorScheme: isDark ? 'dark' : 'light', borderRadius: 10, padding: "9px 12px", color: isDark ? T.darkText : T.slate800, fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" as any };
    const lbl = { fontSize: 10, color: isDark ? T.maroon400 : T.maroon400, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as any, marginBottom: 5, display: "block" };

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.65)", display: "flex", alignItems: isPhone ? "flex-end" : "center", justifyContent: "center", zIndex: 1000, padding: isPhone ? 0 : 20 }}>
            <div style={{ background: isDark ? T.darkCard : T.white, borderRadius: isPhone ? "20px 20px 0 0" : 24, padding: 0, width: "100%", maxWidth: 480, maxHeight: isPhone ? "94vh" : "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
                <div style={{ background: `linear-gradient(135deg,${T.maroon800},${T.maroon900})`, padding: isPhone ? "16px 14px" : "20px 24px", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, background: T.maroon600, borderRadius: "50%", opacity: 0.2, filter: "blur(20px)" }} />
                    <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h2 style={{ color: T.white, fontSize: 17, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                            {isEdit ? "Edit Goal" : "New Goal"}
                        </h2>
                        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: T.white, fontSize: 15, cursor: "pointer", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                    </div>
                </div>

                <div style={{ padding: isPhone ? "16px 14px" : "22px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                        <label style={lbl}>Title *</label>
                        <input style={inp} placeholder="e.g. Study 2 hours: Algebra Revision" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
                    </div>
                    <div>
                        <label style={lbl}>Description (optional)</label>
                        <textarea style={{ ...inp, resize: "vertical", minHeight: 54 }} placeholder="Add details or context..." value={desc} onChange={e => setDesc(e.target.value)} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr 1fr", gap: 12 }}>
                        <div>
                            <label style={lbl}>Category</label>
                            <select style={inp} value={category} onChange={e => setCategory(e.target.value)}>
                                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={lbl}>Priority</label>
                            <select style={inp} value={priority} onChange={e => setPriority(e.target.value)}>
                                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr 1fr", gap: 12 }}>
                        <div>
                            <label style={lbl}>Type</label>
                            <select style={inp} value={type} onChange={e => setType(e.target.value)}>
                                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={lbl}>Due Date</label>
                            <input type="date" style={inp} value={date} onChange={e => setDate(e.target.value)} min={todayStr} max={maxDateStr} />
                        </div>
                    </div>

                    <div>
                        <label style={lbl}>Steps / Sub-tasks</label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                            {subtasks.map(s => (
                                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, background: isDark ? T.darkCardHover : T.slate50, borderRadius: 8, padding: "6px 10px", border: `1px solid ${isDark ? T.darkBorder : T.slate200}` }}>
                                    <span style={{ flex: 1, fontSize: 12, color: isDark ? T.darkText : T.slate700 }}>{s.text}</span>
                                    <button onClick={() => removeSub(s.id)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 13 }}>✕</button>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: "flex", gap: 8, flexDirection: isPhone ? "column" : "row" }}>
                            <input style={{ ...inp, flex: 1 }} placeholder="Add a step..." value={newSub} onChange={e => setNewSub(e.target.value)} onKeyDown={e => e.key === "Enter" && addSub()} />
                            <button onClick={addSub} style={{ background: isDark ? "rgba(45, 212, 191, 0.1)" : T.teal50, border: `1px solid ${isDark ? T.teal700 : T.teal200}`, borderRadius: 10, color: isDark ? T.teal400 : T.teal700, padding: isPhone ? "8px 14px" : "0 14px", cursor: "pointer", fontWeight: 700, fontSize: 18 }}>+</button>
                        </div>
                    </div>

                    <button
                        onClick={submit}
                        disabled={!title.trim()}
                        style={{
                            background: title.trim() ? `linear-gradient(135deg,${T.maroon700},${T.maroon900})` : T.slate100,
                            border: "none", borderRadius: 12, color: title.trim() ? T.white : T.slate400,
                            padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: title.trim() ? "pointer" : "not-allowed",
                            width: "100%", letterSpacing: "0.02em", transition: "all 0.2s",
                            boxShadow: title.trim() ? "0 4px 14px rgba(155,28,28,0.3)" : "none",
                        }}
                    >
                        {isEdit ? "Save Changes" : "Create Goal"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── ANALYTICS ────────────────────────────────────────────────
const Analytics = ({ goals, theme, isPhone, isTablet }: { goals: UIGoal[], theme: string, isPhone: boolean, isTablet: boolean }) => {
    const isDark = theme === 'dark';
    const completed = goals.filter(g => g.completed);
    const total = goals.length;
    const rate = total > 0 ? Math.round((completed.length / total) * 100) : 0;
    const overdueCount = goals.filter(g => isOverdue(g)).length;
    const highPriPending = goals.filter(g => !g.completed && g.priority === "high").length;
    const byCategory = CATEGORIES.map(cat => {
        const cg = goals.filter(g => g.category === cat.value);
        const cd = cg.filter(g => g.completed).length;
        return { ...cat, total: cg.length, done: cd, rate: cg.length ? Math.round((cd / cg.length) * 100) : 0 };
    }).filter(c => c.total > 0);

    return (
        <div style={{ display: "grid", gridTemplateColumns: isTablet ? "1fr" : "1fr 340px", gap: isPhone ? 14 : 24, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr 1fr", gap: 12 }}>
                    {[
                        ["Completion", `${rate}%`, rate >= 70 ? T.teal700 : rate >= 40 ? T.amber500 : "#dc2626"],
                        ["Completed", `${completed.length}/${total}`, T.teal700],
                        ["Overdue", String(overdueCount), overdueCount > 0 ? "#dc2626" : T.teal700],
                        ["High Pri Pending", String(highPriPending), highPriPending > 0 ? T.maroon800 : T.teal700],
                    ].map(([label, val, col]) => (
                        <div key={label} style={{ background: isDark ? T.darkCard : T.white, borderRadius: 16, padding: isPhone ? "14px 16px" : "16px 18px", border: `1px solid ${isDark ? T.darkBorder : T.slate200}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                <span style={{ fontSize: 10, color: isDark ? T.darkTextMuted : T.slate500, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
                            </div>
                            <div style={{ fontSize: 26, fontWeight: 800, color: col }}>{val}</div>
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
                        <span style={{ fontSize: 13, color: isDark ? T.darkTextMuted : T.slate500 }}>Completion</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? T.teal400 : T.teal700 }}>{rate}%</span>
                    </div>
                </div>
            </div>

            <div style={{ background: isDark ? T.darkCard : T.white, borderRadius: 20, padding: 20, border: `1px solid ${isDark ? T.darkBorder : T.slate200}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: isDark ? T.darkText : T.slate800, margin: "0 0 16px" }}>Focus Areas</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {byCategory.map(cat => (
                        <div key={cat.value}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                                <span style={{ fontSize: 12, color: isDark ? T.darkTextMuted : T.slate600, fontWeight: 600 }}>{cat.label}</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: cat.color }}>{cat.done}/{cat.total}</span>
                            </div>
                            <div style={{ height: 6, background: isDark ? T.darkCardHover : T.slate100, borderRadius: 10, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${cat.rate}%`, background: cat.color, borderRadius: 10, transition: "width 0.6s ease" }} />
                            </div>
                        </div>
                    ))}
                </div>
                {highPriPending > 0 && (
                    <div style={{ marginTop: 16, background: isDark ? "rgba(30, 64, 175, 0.2)" : T.blue50, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <p style={{ fontSize: 11, color: isDark ? T.blue50 : T.blue800, lineHeight: 1.5, margin: 0 }}>
                            You have {highPriPending} high-priority goal{highPriPending > 1 ? "s" : ""} pending — tackle those first!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── MAIN ─────────────────────────────────────────────────────
export default function Goals() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [viewportWidth, setViewportWidth] = useState(
        typeof window !== "undefined" ? window.innerWidth : 1280
    );
    const [goals, setGoals] = useState<UIGoal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterCat, setFilterCat] = useState("all");
    const [filterStatus, setFilterStatus] = useState("pending");
    const [sortBy, setSortBy] = useState("priority");
    const [modal, setModal] = useState<any>(null);
    const [tab, setTab] = useState("goals");
    const getErrorMessage = (error: unknown, fallback: string) =>
        error instanceof Error && error.message ? error.message : fallback;
    const getScheduledKey = (g: UIGoal) => g.scheduledDate ? getISTDateKey(new Date(g.scheduledDate)) : null;
    const isScheduledForToday = (g: UIGoal) => getScheduledKey(g) === todayStr;

    const fetchGoals = async () => {
        try {
            const res = await dataService.getGoals();
            const data: UIGoal[] = (res || []).map(g => ({
                ...g,
                subtasks: (g as any).subtasks || [],
                priority: (g as any).priority || 'medium',
                category: (g as any).category || 'other',
                title: g.title || g.text || '',
                type: g.type === "weekly" || g.type === "daily" ? g.type : "daily"
            }));
            setGoals(data);
        } catch (error) {
            console.error(error);
            toast.error(getErrorMessage(error, "Failed to load goals"));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchGoals(); }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const onResize = () => setViewportWidth(window.innerWidth);
        onResize();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const toggleGoal = async (id: string, currentCompleted: boolean) => {
        setGoals(gs => gs.map(g =>
            g.id !== id ? g : { ...g, completed: !currentCompleted, completedAt: !currentCompleted ? todayStr : null }
        ));
        try {
            await dataService.updateGoal(id, !currentCompleted);
            toast.success(!currentCompleted ? "Goal completed!" : "Goal marked uncompleted");
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to update goal"));
            fetchGoals();
        }
    };

    const toggleSubtask = async (goalId: string, subId: string) => {
        const goal = goals.find(g => g.id === goalId);
        if (!goal) return;
        const updatedSubtasks = goal.subtasks.map(s => s.id === subId ? { ...s, done: !s.done } : s);

        setGoals(gs => gs.map(g =>
            g.id !== goalId ? g : { ...g, subtasks: updatedSubtasks }
        ));

        try {
            await dataService.updateGoalDetails(goalId, { subtasks: updatedSubtasks });
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to update subtask"));
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
            setGoals(gs => gs.map(g => g.id === modal.goal.id ? { ...g, ...data, text: data.title } as UIGoal : g));
            setModal(null);
            try {
                await dataService.updateGoalDetails(modal.goal.id, {
                    title: data.title,
                    description: data.description,
                    category: data.category,
                    priority: data.priority,
                    subtasks: data.subtasks,
                    type: data.type,
                });
                if (getScheduledKey(modal.goal) !== data.scheduledDate) {
                    await dataService.rescheduleGoal(modal.goal.id, new Date(data.scheduledDate));
                }
                toast.success("Goal updated");
            } catch (error) { toast.error(getErrorMessage(error, "Update failed")); fetchGoals(); }
        } else {
            const tempId = uniqueId();
            const newG: UIGoal = { id: tempId, userId: "mock", text: data.title, ...data, completed: false, completedAt: null, createdAt: new Date().toISOString() };
            setGoals(gs => [...gs, newG]);
            setModal(null);
            try {
                await dataService.addGoal({
                    title: data.title,
                    type: data.type,
                    scheduledDate: data.scheduledDate,
                    description: data.description,
                    category: data.category,
                    priority: data.priority,
                    subtasks: data.subtasks,
                });
                toast.success("Goal Created");
                fetchGoals();
            } catch (error) { toast.error(getErrorMessage(error, "Creation failed")); fetchGoals(); }
        }
    };

    const priOrder: any = { high: 0, medium: 1, low: 2 };
    const processed = useMemo(() =>
        goals.filter(g => {
            const q = search.toLowerCase();
            if (q && !g.title.toLowerCase().includes(q) && !(g.description || "").toLowerCase().includes(q)) return false;
            if (filterCat !== "all" && g.category !== filterCat) return false;
            if (filterStatus === "pending") return !g.completed;
            if (filterStatus === "completed") return g.completed;
            if (filterStatus === "overdue") return isOverdue(g);
            return true;
        }).sort((a, b) => {
            if (sortBy === "priority") return priOrder[a.priority] - priOrder[b.priority];
            if (sortBy === "date") {
                const aKey = getScheduledKey(a) || "9999-12-31";
                const bKey = getScheduledKey(b) || "9999-12-31";
                return aKey < bKey ? -1 : 1;
            }
            if (sortBy === "category") return a.category.localeCompare(b.category);
            return 0;
        }),
        [goals, search, filterCat, filterStatus, sortBy]);

    const pendingCount = goals.filter(g => !g.completed).length;
    const overdueCount = goals.filter(g => isOverdue(g)).length;
    const todayGoals = goals.filter(g => isScheduledForToday(g));
    const todayDone = todayGoals.filter(g => g.completed).length;
    const todayPct = todayGoals.length > 0 ? Math.round((todayDone / todayGoals.length) * 100) : 0;

    const heroGoal = goals.find(g => !g.completed && g.priority === "high" && isScheduledForToday(g))
        || goals.find(g => !g.completed && isScheduledForToday(g));

    const filterChip = (active: boolean, onClick: () => void, label: string, accentColor?: string) => (
        <button onClick={onClick} style={{
            padding: isPhone ? "5px 11px" : "5px 14px", borderRadius: 20, fontSize: isPhone ? 11 : 12, fontWeight: 600, cursor: "pointer",
            background: active ? (accentColor ? accentColor + "15" : (isDark ? "rgba(45, 212, 191, 0.1)" : T.teal50)) : (isDark ? T.darkCardHover : T.white),
            border: `1px solid ${active ? (accentColor || (isDark ? T.teal400 : T.teal700)) : (isDark ? T.darkBorder : T.slate200)}`,
            color: active ? (accentColor || (isDark ? T.teal400 : T.teal700)) : (isDark ? T.darkTextMuted : T.slate500),
            transition: "all 0.15s",
        }}>{label}</button>
    );

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
                            onClick={() => setModal({ mode: "add" })}
                            style={{ background: `linear-gradient(135deg,${T.maroon800},${T.maroon900})`, border: "none", borderRadius: 12, color: T.white, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(155,28,28,0.28)", width: isPhone ? "100%" : "auto" }}
                        >
                            ＋ New Goal
                        </button>
                    </header>

                    <div style={{ display: "flex", gap: 4, marginBottom: isPhone ? 16 : 24, background: isDark ? T.darkCard : T.white, borderRadius: 12, padding: 4, width: isPhone ? "100%" : "fit-content", border: `1px solid ${isDark ? T.darkBorder : T.slate200}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                        {[["goals", "Goals"], ["analytics", "Analytics"]].map(([k, l]) => (
                            <button key={k} onClick={() => setTab(k)} style={{
                                background: tab === k ? `linear-gradient(135deg,${T.teal800},${T.teal900})` : "transparent",
                                border: "none", borderRadius: 10, color: tab === k ? T.white : (isDark ? T.darkTextMuted : T.slate500),
                                padding: "7px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", flex: isPhone ? 1 : undefined,
                                boxShadow: tab === k ? "0 2px 8px rgba(17,94,89,0.3)" : "none",
                            }}>{l}</button>
                        ))}
                    </div>

                    {tab === "analytics" ? <Analytics goals={goals} theme={theme} isPhone={isPhone} isTablet={isTablet} /> : (
                        <div style={{ display: "grid", gridTemplateColumns: contentGrid, gap: isPhone ? 14 : 24, alignItems: "start" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: isPhone ? 14 : 20 }}>
                                {heroGoal && (
                                    <div style={{ background: `linear-gradient(135deg,${T.teal800},${T.teal900})`, borderRadius: isPhone ? 18 : 24, padding: isPhone ? "16px" : "24px 28px", color: T.white, position: "relative", overflow: "hidden", boxShadow: "0 10px 30px rgba(17,94,89,0.22)" }}>
                                        <div style={{ position: "absolute", top: -50, right: -50, width: 180, height: 180, background: T.teal600, borderRadius: "50%", opacity: 0.2, filter: "blur(50px)" }} />
                                        <div style={{ position: "absolute", bottom: -30, left: -20, width: 120, height: 120, background: T.maroon700, borderRadius: "50%", opacity: 0.15, filter: "blur(30px)" }} />
                                        <div style={{ position: "relative", zIndex: 1 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: isPhone ? "flex-start" : "center", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
                                                <span style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.teal100, border: "1px solid rgba(255,255,255,0.1)" }}>
                                                    Priority Focus
                                                </span>
                                                <span style={{ fontSize: 12, color: T.teal200, fontWeight: 500 }}>Due {formatDate(heroGoal.scheduledDate)}</span>
                                            </div>
                                            <h2 style={{ fontSize: isPhone ? 18 : 22, fontWeight: 800, lineHeight: 1.3, marginBottom: 8, margin: "0 0 8px" }}>{heroGoal.title}</h2>
                                            {heroGoal.description && <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", margin: "0 0 16px" }}>{heroGoal.description}</p>}

                                            {heroGoal.subtasks.length > 0 && (
                                                <div style={{ margin: "16px 0" }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                                        <span style={{ fontSize: 12, color: T.teal200 }}>
                                                            {heroGoal.subtasks.filter((s: any) => s.done).length} of {heroGoal.subtasks.length} steps done
                                                        </span>
                                                        <span style={{ fontSize: 12, fontWeight: 700 }}>
                                                            {Math.round((heroGoal.subtasks.filter((s: any) => s.done).length / heroGoal.subtasks.length) * 100)}%
                                                        </span>
                                                    </div>
                                                    <div style={{ height: 8, background: "rgba(0,0,0,0.2)", borderRadius: 10, overflow: "hidden" }}>
                                                        <div style={{ height: "100%", width: `${Math.round((heroGoal.subtasks.filter((s: any) => s.done).length / heroGoal.subtasks.length) * 100)}%`, background: `linear-gradient(90deg,${T.teal300},${T.white})`, borderRadius: 10, boxShadow: "0 0 12px rgba(94,234,212,0.4)" }} />
                                                    </div>
                                                </div>
                                            )}

                                            <div style={{ display: "flex", gap: 10, marginTop: 20, flexDirection: isPhone ? "column" : "row" }}>
                                                <button
                                                    onClick={() => toggleGoal(heroGoal.id, heroGoal.completed)}
                                                    style={{ flex: 1, padding: "12px 0", background: T.white, color: T.teal900, border: "none", borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: isPhone ? "100%" : undefined }}
                                                >
                                                    ✓ Mark Done
                                                </button>
                                                <button
                                                    onClick={() => setModal({ mode: "edit", goal: heroGoal })}
                                                    style={{ padding: "12px 20px", background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", color: T.white, border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, fontWeight: 600, fontSize: 13, cursor: "pointer", width: isPhone ? "100%" : undefined }}
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div style={{ background: isDark ? T.darkCard : T.white, borderRadius: isPhone ? 18 : 24, border: `1px solid ${isDark ? T.darkBorder : T.slate200}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden" }}>
                                    <div style={{ padding: isPhone ? "14px 12px" : "16px 20px", borderBottom: `1px solid ${isDark ? T.darkBorder : T.slate100}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <h3 style={{ fontSize: 15, fontWeight: 700, color: isDark ? T.darkText : T.slate800, margin: 0 }}>
                                                {filterStatus === "completed" ? "Completed" : filterStatus === "overdue" ? "Overdue" : "Up Next"}
                                            </h3>
                                            <span style={{ background: isDark ? T.darkCardHover : T.slate100, color: isDark ? T.darkTextMuted : T.slate600, fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 8 }}>{processed.length} Goals</span>
                                        </div>

                                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", width: isPhone ? "100%" : "auto" }}>
                                            <span style={{ fontSize: 11, color: isDark ? T.darkTextMuted : T.slate400, fontWeight: 600 }}>Sort:</span>
                                            {[["priority", "Priority"], ["date", "Date"], ["category", "Category"]].map(([v, l]) => (
                                                <button key={v} onClick={() => setSortBy(v)} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", background: sortBy === v ? T.teal800 : (isDark ? T.darkCardHover : T.slate50), border: `1px solid ${sortBy === v ? T.teal800 : (isDark ? T.darkBorder : T.slate200)}`, color: sortBy === v ? T.white : (isDark ? T.darkTextMuted : T.slate500), transition: "all 0.15s" }}>{l}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ padding: isPhone ? "12px" : "12px 20px", borderBottom: `1px solid ${isDark ? T.darkBorder : T.slate100}`, display: "flex", flexDirection: "column", gap: 10 }}>
                                        <div style={{ position: "relative" }}>
                                            <input
                                                style={{ width: "100%", background: isDark ? T.darkCardHover : T.slate50, border: `1px solid ${isDark ? T.darkBorder : T.slate200}`, borderRadius: 10, padding: "8px 12px", color: isDark ? T.darkText : T.slate800, fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                                                placeholder="Search all goals..."
                                                value={search} onChange={e => setSearch(e.target.value)}
                                            />
                                        </div>
                                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                            {[["pending", "Pending"], ["completed", "Done"], ["overdue", "Overdue"], ["all", "All"]].map(([v, l]) =>
                                                filterChip(filterStatus === v, () => setFilterStatus(v), l, v === "overdue" ? "#dc2626" : undefined)
                                            )}
                                            <div style={{ width: 1, background: isDark ? T.darkBorder : T.slate200, margin: "0 2px", display: isPhone ? "none" : "block" }} />
                                            {filterChip(filterCat === "all", () => setFilterCat("all"), "All")}
                                            {CATEGORIES.map(c => filterChip(filterCat === c.value, () => setFilterCat(c.value), c.label, c.color))}
                                        </div>
                                    </div>

                                    {processed.length === 0 ? (
                                        <div style={{ textAlign: "center", padding: "40px 20px", color: isDark ? T.darkTextMuted : T.slate400 }}>
                                            <div style={{ fontSize: 14, fontWeight: 600 }}>No goals match your filters.</div>
                                        </div>
                                    ) : (
                                        <div>
                                            {processed.map((g, i) => (
                                                <div key={g.id} style={{ borderBottom: i < processed.length - 1 ? `1px solid ${isDark ? T.darkBorder : T.slate50}` : "none" }}>
                                                    <GoalCard theme={theme} isPhone={isPhone} goal={g} onToggle={toggleGoal} onDelete={deleteGoal} onEdit={(g: any) => setModal({ mode: "edit", goal: g })} onToggleSubtask={toggleSubtask} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: isPhone ? 14 : 18 }}>
                                <div style={{ background: isDark ? T.darkCard : T.white, border: `1px solid ${isDark ? T.darkBorder : T.slate200}`, borderRadius: isPhone ? 16 : 20, padding: isPhone ? 14 : 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                                    <h3 style={{ fontSize: 13, fontWeight: 700, color: isDark ? T.darkText : T.slate800, margin: "0 0 14px", display: "flex", justifyContent: "space-between" }}>
                                        <span>Today</span>
                                        <span style={{ fontSize: 11, color: isDark ? T.darkTextMuted : T.slate400, fontWeight: 500 }}>{todayDone}/{todayGoals.length} done</span>
                                    </h3>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
                                        <span style={{ fontSize: 30, fontWeight: 800, color: todayPct === 100 ? (isDark ? T.teal400 : T.teal700) : (isDark ? T.darkText : T.slate800) }}>
                                            {todayPct}<span style={{ fontSize: 16, color: isDark ? T.darkTextMuted : T.slate400, fontWeight: 400 }}>%</span>
                                        </span>
                                        {todayPct === 100 && <span style={{ fontSize: 12, color: isDark ? T.teal400 : T.teal700, fontWeight: 700 }}>All done!</span>}
                                    </div>
                                    <div style={{ height: 8, background: isDark ? T.darkCardHover : T.slate100, borderRadius: 10, overflow: "hidden" }}>
                                        <div style={{ height: "100%", width: `${todayPct}%`, background: todayPct === 100 ? `linear-gradient(90deg,${T.teal500},${T.teal700})` : `linear-gradient(90deg,${T.teal400},${T.teal700})`, borderRadius: 10, transition: "width 0.5s ease" }} />
                                    </div>
                                </div>

                                <div style={{ background: isDark ? T.darkCard : T.white, border: `1px solid ${isDark ? T.darkBorder : T.slate200}`, borderRadius: isPhone ? 16 : 20, padding: isPhone ? 14 : 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: isDark ? T.darkText : T.slate800 }}>History</span>
                                        <span style={{ fontSize: 11, color: isDark ? T.darkTextMuted : T.slate400 }}>Last 7 Days</span>
                                    </div>
                                    <WeekChart goals={goals} />
                                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${isDark ? T.darkBorder : T.slate100}`, display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ fontSize: 13, color: isDark ? T.darkTextMuted : T.slate500 }}>Completion</span>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? T.teal400 : T.teal700 }}>
                                            {goals.length > 0 ? Math.round((goals.filter(g => g.completed).length / goals.length) * 100) : 0}%
                                        </span>
                                    </div>
                                </div>

                                <div style={{ background: isDark ? T.darkCard : T.white, border: `1px solid ${isDark ? T.darkBorder : T.slate200}`, borderRadius: isPhone ? 16 : 20, padding: isPhone ? 14 : 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                                    <h3 style={{ fontSize: 14, fontWeight: 700, color: isDark ? T.darkText : T.slate800, margin: "0 0 12px" }}>Upcoming</h3>
                                    {goals
                                        .filter(g => !g.completed && getScheduledKey(g) && (getScheduledKey(g) as string) > todayStr)
                                        .sort((a, b) => {
                                            const aKey = getScheduledKey(a) || "9999-12-31";
                                            const bKey = getScheduledKey(b) || "9999-12-31";
                                            return aKey < bKey ? -1 : 1;
                                        })
                                        .slice(0, 4)
                                        .map(g => {
                                            const cat = getCat(g.category);
                                            return (
                                                <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 12, marginBottom: 4, cursor: "pointer", transition: "background 0.15s" }}
                                                    onMouseOver={e => e.currentTarget.style.background = isDark ? T.darkCardHover : T.slate50}
                                                    onMouseOut={e => e.currentTarget.style.background = "transparent"}
                                                >
                                                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: isDark ? cat.color + "33" : cat.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{cat.emoji}</div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? T.darkText : T.slate700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.title}</div>
                                                        <div style={{ fontSize: 10, color: isDark ? T.darkTextMuted : T.slate400 }}>{cat.label} · {formatDate(g.scheduledDate)}</div>
                                                    </div>
                                                    <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${isDark ? T.darkBorder : T.slate200}`, flexShrink: 0 }} />
                                                </div>
                                            );
                                        })}
                                    {goals.filter(g => !g.completed && getScheduledKey(g) && (getScheduledKey(g) as string) > todayStr).length === 0 && (
                                        <p style={{ fontSize: 12, color: isDark ? T.darkTextMuted : T.slate400, textAlign: "center", padding: "8px 0" }}>Nothing scheduled ahead.</p>
                                    )}
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr 1fr", gap: 10 }}>
                                    <div style={{ background: `linear-gradient(135deg,${T.teal800},${T.teal900})`, borderRadius: 16, padding: "14px 16px", color: T.white, boxShadow: `0 4px 14px rgba(17,94,89,0.22)` }}>
                                        <div style={{ fontSize: 24, fontWeight: 800 }}>{pendingCount}</div>
                                        <div style={{ fontSize: 11, color: T.teal200, fontWeight: 600, marginTop: 2 }}>Pending</div>
                                    </div>
                                    <div style={{ background: `linear-gradient(135deg,${T.maroon800},${T.maroon900})`, borderRadius: 16, padding: "14px 16px", color: T.white, boxShadow: `0 4px 14px rgba(155,28,28,0.22)` }}>
                                        <div style={{ fontSize: 24, fontWeight: 800 }}>{overdueCount}</div>
                                        <div style={{ fontSize: 11, color: T.maroon200, fontWeight: 600, marginTop: 2 }}>Overdue</div>
                                    </div>
                                </div>

                                <div style={{ background: `linear-gradient(135deg,${T.slate800},${T.slate900})`, borderRadius: 16, padding: "16px 18px", color: T.white, position: "relative", overflow: "hidden" }}>
                                    <div style={{ position: "absolute", top: -24, right: -24, width: 80, height: 80, background: T.teal500, borderRadius: "50%", opacity: 0.18, filter: "blur(20px)" }} />
                                    <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 10 }}>
                                        <div>
                                            <p style={{ fontSize: 10, fontWeight: 700, color: T.teal400, letterSpacing: "0.07em", textTransform: "uppercase", margin: "0 0 5px" }}>Wellness Tip</p>
                                            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.55, margin: 0, fontStyle: "italic" }}>"Take breaks, stay balanced, succeed sustainably."</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                {modal && <GoalModal theme={theme} isPhone={isPhone} goal={modal.mode === "edit" ? modal.goal : null} onSave={saveGoal} onClose={() => setModal(null)} />}
            </div>
        </NishthaLayout>
    );
}

