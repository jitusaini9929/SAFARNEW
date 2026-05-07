import { useFocus } from "@/contexts/FocusContext";
import { Timer, X, Play } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * A toast banner that appears when a previous Ekagra timer session is detected
 * in localStorage after a page refresh / re-open. Offers Resume or Discard.
 */
export function ResumeSessionToast() {
    const { hasPendingResume, resumeStoredSession, discardStoredSession } = useFocus();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (hasPendingResume) {
            // Small delay so the toast slides in after page paint
            const t = window.setTimeout(() => setVisible(true), 400);
            return () => window.clearTimeout(t);
        }
        setVisible(false);
    }, [hasPendingResume]);

    if (!hasPendingResume) return null;

    return (
        <div
            className={`fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2 transition-all duration-500 ease-out ${
                visible
                    ? "translate-y-0 opacity-100"
                    : "translate-y-8 opacity-0 pointer-events-none"
            }`}
        >
            <div className="flex items-center gap-3 rounded-2xl border border-orange-500/30 bg-card/95 px-5 py-3 shadow-2xl shadow-orange-500/10 backdrop-blur-xl">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
                    <Timer className="h-4 w-4 text-orange-400" />
                </div>

                <p className="text-sm font-medium text-foreground">
                    You have an unfinished focus session
                </p>

                <div className="ml-2 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={resumeStoredSession}
                        className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-600 active:bg-orange-700"
                    >
                        <Play className="h-3 w-3" />
                        Resume
                    </button>
                    <button
                        type="button"
                        onClick={discardStoredSession}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Dismiss"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
