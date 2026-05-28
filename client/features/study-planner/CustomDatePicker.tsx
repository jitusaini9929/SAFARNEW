import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { toIsoDateOnly } from "./plan.model";

const PLANNER_PRESS_EASE = "motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)]";
const PLANNER_PRESSABLE = `motion-safe:transition-[transform,box-shadow,background-color,border-color,color,opacity] motion-safe:duration-150 ${PLANNER_PRESS_EASE} motion-reduce:transition-colors active:scale-[0.97] active:translate-y-[1px] disabled:active:scale-100 disabled:active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40`;

export type CustomDatePickerProps = {
  value: string;
  onChange: (val: string) => void;
  isDarkMode: boolean;
  align?: "top" | "bottom";
  offDays?: number[];
  minDate?: string;
  fullWidth?: boolean;
};

export function CustomDatePicker({
  value,
  onChange,
  isDarkMode,
  align,
  offDays = [],
  minDate,
  fullWidth = false,
}: CustomDatePickerProps) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const alignment = align || "bottom";

  const parsed = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(parsed.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed.getMonth());

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;

    const handlePointerOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!pickerRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerOutside);
    document.addEventListener("touchstart", handlePointerOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerOutside);
      document.removeEventListener("touchstart", handlePointerOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const minCalendarYear =
    minDate && /^\d{4}-\d{2}-\d{2}$/.test(minDate)
      ? Number.parseInt(minDate.slice(0, 4), 10)
      : null;
  let prevMonthDisabled = false;
  if (minDate && /^\d{4}-\d{2}-\d{2}$/.test(minDate)) {
    const parts = minDate.split("-").map((x) => Number.parseInt(x, 10));
    if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
      const [minY, minMo1] = parts;
      const minMonth0 = minMo1 - 1;
      prevMonthDisabled =
        viewYear < minY || (viewYear === minY && viewMonth <= minMonth0);
    }
  }
  const yearBackDisabled =
    minCalendarYear !== null && viewYear - 1 < minCalendarYear;

  const selectedKey = value || "";

  function pickDay(day: number) {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  }

  function prevMonth() {
    if (minDate && /^\d{4}-\d{2}-\d{2}$/.test(minDate)) {
      const parts = minDate.split("-").map((x) => Number.parseInt(x, 10));
      if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
        const [minY, minMo1] = parts;
        const minMonth0 = minMo1 - 1;
        if (viewYear < minY || (viewYear === minY && viewMonth <= minMonth0)) {
          return;
        }
      }
    }
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  }

  const displayText = value
    ? `${new Date(value).getDate()} ${MONTHS[new Date(value).getMonth()]} ${new Date(value).getFullYear()}`
    : "Select date";

  const bg = isDarkMode ? "bg-[#1a1c1e]" : "bg-white";
  const border = isDarkMode ? "border-[#3a3d42]" : "border-[#d1d5db]";
  const text = isDarkMode ? "text-white" : "text-[#1a202c]";
  const muted = isDarkMode ? "text-[#9aa2ae]" : "text-[#64748b]";
  const hoverBg = isDarkMode ? "hover:bg-[#2a2d31]" : "hover:bg-[#f0f5ff]";
  const selectedBg = "bg-blue-600 text-white";

  return (
    <div
      ref={pickerRef}
      className={fullWidth ? "relative block w-full" : "relative inline-block"}
    >
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border ${bg} ${border} ${text} ${PLANNER_PRESSABLE} ${fullWidth ? "w-full justify-between" : ""}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
        {displayText}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{
              opacity: 0,
              y: alignment === "top" ? 8 : -8,
              scale: 0.96,
            }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: alignment === "top" ? 8 : -8, scale: 0.96 }}
            className={`absolute ${alignment === "top" ? "bottom-full mb-2" : "top-full mt-2"} left-0 z-[120] w-[280px] rounded-2xl border shadow-2xl p-4 ${bg} ${border}`}
          >
            {/* Month/Year header */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={prevMonth}
                disabled={prevMonthDisabled}
                aria-disabled={prevMonthDisabled}
                className={`p-1.5 rounded-lg ${text} ${
                  prevMonthDisabled
                    ? "opacity-30 cursor-not-allowed"
                    : `${hoverBg} ${PLANNER_PRESSABLE}`
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <span className={`text-sm font-bold ${text}`}>
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className={`p-1.5 rounded-lg ${hoverBg} ${text} ${PLANNER_PRESSABLE}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DOW.map((d) => (
                <div
                  key={d}
                  className={`text-center text-[12px] font-bold uppercase ${muted}`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDow }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const mm = String(viewMonth + 1).padStart(2, "0");
                const dd = String(day).padStart(2, "0");
                const iso = `${viewYear}-${mm}-${dd}`;
                const isSelected = iso === selectedKey;
                const isTodayCell = iso === toIsoDateOnly(new Date());
                const dow = new Date(viewYear, viewMonth, day).getDay();
                const isBeforeMin = minDate ? iso < minDate : false;
                const isRestDay = offDays?.includes(dow);
                const isDisabled = isRestDay || isBeforeMin;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      if (!isDisabled) pickDay(day);
                    }}
                    disabled={isDisabled}
                    className={`w-full aspect-square flex flex-col items-center justify-center rounded-lg text-sm relative
                      ${isDisabled ? "opacity-40 cursor-not-allowed font-medium bg-[#f3f4f6] text-[#9ca3af] dark:bg-[#121314] dark:text-[#4b5563]" : `font-bold ${PLANNER_PRESSABLE} hover:bg-[#f0f5ff] dark:hover:bg-[#2a2d31]`}
                      ${!isDisabled && isSelected ? selectedBg : ""}
                      ${!isDisabled && !isSelected && isTodayCell ? `ring-1 ring-blue-400 ${text}` : ""}
                      ${!isDisabled && !isSelected && !isTodayCell ? `${text}` : ""}
                    `}
                  >
                    <span>{day}</span>
                    {isRestDay && !isBeforeMin && (
                      <span className="text-[6px] uppercase font-black text-amber-500 absolute bottom-[2px]">
                        Off
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Year jump */}
            <div
              className="flex items-center gap-2 mt-3 pt-3 border-t"
              style={{ borderColor: isDarkMode ? "#3a3d42" : "#e5e7eb" }}
            >
              <button
                type="button"
                onClick={() => {
                  if (yearBackDisabled) return;
                  setViewYear((y) => y - 1);
                }}
                disabled={yearBackDisabled}
                aria-disabled={yearBackDisabled}
                className={`text-[12px] font-bold px-2 py-1 rounded ${muted} ${
                  yearBackDisabled
                    ? "opacity-30 cursor-not-allowed"
                    : `${hoverBg} ${PLANNER_PRESSABLE}`
                }`}
              >
                &larr; Year
              </button>
              <span className={`flex-1 text-center text-sm font-bold ${muted}`}>
                {viewYear}
              </span>
              <button
                type="button"
                onClick={() => setViewYear((y) => y + 1)}
                className={`text-[12px] font-bold px-2 py-1 rounded ${hoverBg} ${muted} ${PLANNER_PRESSABLE}`}
              >
                Year &rarr;
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
