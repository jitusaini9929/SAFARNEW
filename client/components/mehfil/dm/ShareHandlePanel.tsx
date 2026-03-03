import { useMemo, useState } from "react";

interface ShareHandlePanelProps {
  show: boolean;
  onShare: (platform: "linkedin" | "instagram" | "discord", handle: string) => void;
}

const PLATFORMS: Array<{ id: "linkedin" | "instagram" | "discord"; label: string }> = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
  { id: "discord", label: "Discord" },
];

export function ShareHandlePanel({ show, onShare }: ShareHandlePanelProps) {
  const [platform, setPlatform] = useState<"linkedin" | "instagram" | "discord">("discord");
  const [handle, setHandle] = useState("");

  const placeholder = useMemo(() => `Your ${platform} handle`, [platform]);

  if (!show) return null;

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 px-3 py-2">
      <p className="mb-2 text-xs text-slate-600 dark:text-slate-300">Share your handle</p>
      <div className="mb-2 flex gap-1">
        {PLATFORMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPlatform(item.id)}
            className={`rounded-lg px-2 py-1 text-xs ${platform === item.id ? "bg-slate-200 dark:bg-slate-700" : "bg-slate-100 dark:bg-slate-800"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder={placeholder}
          className="h-8 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-900"
        />
        <button
          type="button"
          onClick={() => {
            const normalized = handle.trim().replace(/^@+/, "");
            if (!normalized) return;
            onShare(platform, normalized);
            setHandle("");
          }}
          className="rounded-lg bg-teal-600 px-2 text-xs font-medium text-white"
        >
          Share
        </button>
      </div>
    </div>
  );
}
