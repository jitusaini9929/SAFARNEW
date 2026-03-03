import { X } from "lucide-react";

interface ChatHeaderProps {
  otherUserName: string;
  onClose: () => void;
  onToggleHandlePanel: () => void;
  showHandlePanel: boolean;
}

export function ChatHeader({ otherUserName, onClose, onToggleHandlePanel, showHandlePanel }: ChatHeaderProps) {
  return (
    <div className="bg-slate-50 dark:bg-[#162032] p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 shrink-0">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
            {otherUserName.charAt(0).toUpperCase()}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#162032] rounded-full"></div>
        </div>
        <div>
          <h3 className="font-bold text-slate-800 dark:text-white text-sm leading-tight">{otherUserName}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></span>
            Ephemeral chat
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleHandlePanel}
          className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition text-[10px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide"
        >
          {showHandlePanel ? "Hide Handle" : "Share Handle"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition"
          aria-label="Close chat"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
