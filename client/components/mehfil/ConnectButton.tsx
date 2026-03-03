import { Link2 } from "lucide-react";
import { useDMStore, type DMContext } from "@/store/dmStore";

interface ConnectButtonProps {
  targetUserId?: string | null;
  context: DMContext;
  disabled?: boolean;
  className?: string;
}

export function ConnectButton({ targetUserId, context, disabled = false, className }: ConnectButtonProps) {
  const sendRequest = useDMStore((state) => state.sendRequest);
  const requestState = useDMStore((state) => state.requestState);

  const canSend = Boolean(targetUserId) && !disabled;

  return (
    <button
      type="button"
      disabled={!canSend || requestState === "pending"}
      onClick={() => {
        if (!targetUserId || !canSend) return;
        sendRequest(targetUserId, context);
      }}
      className={
        className ||
        "text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 flex items-center gap-1 transition-colors disabled:opacity-60"
      }
      title={canSend ? "Connect" : "Connect unavailable"}
    >
      <Link2 size={12} />
      {requestState === "pending" ? "Waiting..." : "Connect"}
    </button>
  );
}
