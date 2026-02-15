import { useEffect, useState } from "react";
import MehfilView from "@/components/mehfil/Mehfil";

export default function MehfilPage() {
  const [pausedMessage, setPausedMessage] = useState<string | null>(null);
  const [checkedPause, setCheckedPause] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const detectPause = async () => {
      try {
        const response = await fetch("/api/mehfil", {
          method: "GET",
          credentials: "include",
        });

        if (cancelled) return;

        if (response.status === 503) {
          const body = await response.json().catch(() => null);
          const message =
            typeof body?.message === "string"
              ? body.message
              : "Mehfil under construction, check back soon!";
          setPausedMessage(message);
        } else {
          setPausedMessage(null);
        }
      } catch {
        // Network errors should not block the page render.
        if (!cancelled) setPausedMessage(null);
      } finally {
        if (!cancelled) setCheckedPause(true);
      }
    };

    detectPause();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!checkedPause) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-xl w-full rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">Loading Mehfil...</h1>
        </div>
      </div>
    );
  }

  if (pausedMessage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-xl w-full rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {pausedMessage}
          </h1>
        </div>
      </div>
    );
  }

  return <MehfilView />;
}
