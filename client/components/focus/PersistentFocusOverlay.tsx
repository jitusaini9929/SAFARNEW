import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Pause, Play, RefreshCw, Minimize2, Maximize2, MoreVertical, PictureInPicture2, ExternalLink } from "lucide-react";
import { useFocus } from "@/contexts/FocusContext";

const OVERLAY_SIZE = 240;
const OVERLAY_MIN_SIZE = 210;
const OVERLAY_MAX_SIZE = 280;
const OVERLAY_EDGE_GAP = 12;

function clampPosition(x: number, y: number): { x: number; y: number } {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const maxX = Math.max(OVERLAY_EDGE_GAP, width - OVERLAY_SIZE - OVERLAY_EDGE_GAP);
  const maxY = Math.max(OVERLAY_EDGE_GAP, height - OVERLAY_SIZE - OVERLAY_EDGE_GAP);
  return {
    x: Math.min(maxX, Math.max(OVERLAY_EDGE_GAP, x)),
    y: Math.min(maxY, Math.max(OVERLAY_EDGE_GAP, y)),
  };
}

function formatTime(minutes: number, seconds: number) {
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function PersistentFocusOverlay() {
  const {
    timerState,
    toggleTimer,
    resetTimer,
    togglePiP,
    isPiPActive,
    stats,
    totalActiveMs
  } = useFocus();

  const { minutes, seconds, isRunning, mode, remainingSeconds, totalSeconds } = timerState;

  const navigate = useNavigate();
  const location = useLocation();

  // Local UI State
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);

  const dragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // Restore position from local storage
  useEffect(() => {
    const saved = localStorage.getItem("pfo_position");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPosition(clampPosition(parsed.x, parsed.y));
      } catch (e) { /* ignore */ }
    }
  }, []);

  // Save position
  useEffect(() => {
    localStorage.setItem("pfo_position", JSON.stringify(position));
  }, [position]);

  // Handle Resize
  useEffect(() => {
    const onResize = () => {
      setPosition((prev) => clampPosition(prev.x, prev.y));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
    setExpanded(false);
  };

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    const target = event.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("label")) {
      return;
    }
    const clamped = clampPosition(position.x, position.y);
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - clamped.x,
      offsetY: event.clientY - clamped.y,
    };
    setDragging(true);
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
  };

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    const next = clampPosition(event.clientX - dragRef.current.offsetX, event.clientY - dragRef.current.offsetY);
    setPosition(next);
  };

  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  };

  const hasActiveSession = isRunning || remainingSeconds < totalSeconds || isPiPActive;

  const openFocusSession = () => {
    if (location.pathname !== "/study") {
      navigate("/study");
    }
  };

  // If we are on the StudyWithMe page, we might want to hide this overlay 
  // to avoid duplication, or keep it synchronized. 
  // The user requested "Persistent Focus Overlay" which implies it's always there.
  // But typically you hide the mini-player when on the main player page.
  // checking path:
  if (!hasActiveSession) {
    return null;
  }

  if (location.pathname.startsWith("/study") || isPiPActive) {
    return null;
  }

  // Collapsed View
  if (isCollapsed) {
    return (
      <button
        onClick={toggleCollapse}
        style={{
          zIndex: 50,
          top: `${position.y}px`,
          left: 0,
          transition: "top 180ms ease-out",
        }}
        className="fixed h-24 w-6 bg-slate-900 text-white rounded-r-xl shadow-xl flex flex-col items-center justify-center gap-2 cursor-pointer border-y border-r border-slate-700 hover:w-8 transition-all group"
        title="Expand focus timer"
      >
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" style={{ opacity: isRunning ? 1 : 0 }} />
        <MoreVertical className="w-4 h-4 text-slate-400 group-hover:text-white" />
        <Maximize2 className="w-3 h-3 text-slate-500 group-hover:text-white" />
      </button>
    );
  }

  // Expanded View
  return (
    <>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          zIndex: 50,
          width: `${OVERLAY_SIZE}px`,
          height: `${OVERLAY_SIZE}px`,
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          transition: dragging ? "none" : "transform 180ms ease-out",
          cursor: dragging ? "grabbing" : "grab",
        }}
        className="fixed top-0 left-0 rounded-3xl border-2 border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-2xl select-none flex flex-col p-5"
        aria-label="Persistent focus overlay"
      >
        {/* Minimize Button */}
        <button
          onClick={openFocusSession}
          className="absolute top-3 left-3 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center"
          title="Open focus session"
        >
          <ExternalLink className="w-3 h-3" />
        </button>

        <button
          onClick={toggleCollapse}
          className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center"
          title="Minimize to side"
        >
          <Minimize2 className="w-3 h-3" />
        </button>

        {/* Time Display */}
        <div
          onClick={openFocusSession}
          className="rounded-2xl bg-slate-900 text-white flex items-center justify-center text-4xl font-bold tracking-tight mt-6 shadow-sm flex-1 cursor-pointer"
          title="Open focus session"
        >
          {formatTime(minutes, seconds)}
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <button
            onClick={toggleTimer}
            className={`rounded-xl text-white flex items-center justify-center hover:opacity-90 transition-colors shadow-sm py-3 ${isRunning ? "bg-amber-500" : "bg-emerald-500"
              }`}
            title={isRunning ? "Pause" : "Start"}
          >
            {isRunning ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
          </button>
          <button
            onClick={togglePiP}
            className={`rounded-xl flex items-center justify-center hover:opacity-90 transition-colors shadow-sm py-3 ${isPiPActive ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-700"
              }`}
            title="Picture in Picture"
          >
            <PictureInPicture2 className="w-6 h-6" />
          </button>
        </div>

        <div className="mt-3 flex justify-between gap-2">
          <button
            onClick={() => setExpanded((prev) => !prev)}
            className="flex-1 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-colors shadow-sm py-2"
            title="Stats"
          >
            <BarChart3 className="w-5 h-5" />
          </button>
          <button
            onClick={resetTimer}
            className="flex-1 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-300 transition-colors py-2"
            title="Reset session"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Popout */}
      {expanded && (
        <div
          style={{
            zIndex: 50,
            transform: `translate3d(${position.x + OVERLAY_SIZE + 10}px, ${position.y}px, 0)`,
          }}
          className="fixed top-0 left-0 w-56 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xl shadow-xl p-3 text-xs"
        >
          <div className="font-bold text-slate-900 mb-2">Focus Stats</div>
          <div className="space-y-1.5 text-slate-700">
            <div className="flex justify-between">
              <span>Active</span>
              <span className="font-semibold">{(totalActiveMs / 60000).toFixed(0)}m</span>
            </div>
            {/* Add more stats from Context if available */}
            <div className="text-xs text-slate-400 mt-2 italic">
              More stats coming soon...
            </div>
          </div>
        </div>
      )}
    </>
  );
}
