import { Clock } from "lucide-react";
import { useFocus } from "@/contexts/FocusContext";

export function PiPNudgeToast() {
    const { showPiPNudge, dismissPiPNudge, togglePiP } = useFocus();

    if (!showPiPNudge) return null;

    const handleFloat = async () => {
        dismissPiPNudge();
        await togglePiP();
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] w-[calc(100vw-2rem)] max-w-md rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-3 text-white shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-400 shrink-0" />
                <p className="text-sm text-slate-200 flex-1">Keep timer visible while multitasking</p>
                <button
                    onClick={dismissPiPNudge}
                    className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    aria-label="Dismiss floating timer suggestion"
                >
                    x
                </button>
            </div>
            <div className="mt-3 flex justify-end">
                <button
                    onClick={handleFloat}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                    Float it
                </button>
            </div>
        </div>
    );
}
