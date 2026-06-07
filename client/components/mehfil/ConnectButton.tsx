import { useState } from "react";
import { Link2, Lock } from "lucide-react";
import { useDMStore, type DMContext } from "@/store/dmStore";
import { usePremiumFeatures } from "@/hooks/usePremiumFeatures";
import { PremiumGateDialog } from "@/components/premium/PremiumGateDialog";

interface ConnectButtonProps {
  targetUserId?: string | null;
  context: DMContext;
  disabled?: boolean;
  className?: string;
}

export function ConnectButton({ targetUserId, context, disabled = false, className }: ConnectButtonProps) {
  const sendRequest = useDMStore((state) => state.sendRequest);
  const requestState = useDMStore((state) => state.requestState);
  const { mehfilDm, isLoading } = usePremiumFeatures();
  const [gateOpen, setGateOpen] = useState(false);

  const canSend = Boolean(targetUserId) && !disabled;
  const isLocked = !isLoading && !mehfilDm;

  const handleClick = () => {
    if (!targetUserId || !canSend || requestState === "pending") return;

    if (isLocked) {
      setGateOpen(true);
      return;
    }

    sendRequest(targetUserId, context);
  };

  return (
    <>
      <button
        type="button"
        disabled={!canSend || requestState === "pending"}
        onClick={handleClick}
        className={
          className ||
          "text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 flex items-center gap-1 transition-colors disabled:opacity-60"
        }
        title={
          !canSend
            ? "Connect unavailable"
            : isLocked
              ? "Connect is a Premium feature"
              : "Connect"
        }
      >
        {isLocked ? <Lock size={12} /> : <Link2 size={12} />}
        {requestState === "pending" ? "Waiting..." : "Connect"}
      </button>

      <PremiumGateDialog open={gateOpen} onOpenChange={setGateOpen} />
    </>
  );
}
