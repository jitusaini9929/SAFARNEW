import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { FocusAnalyticsPanel } from "@/components/analytics/FocusAnalyticsPanel";

type FocusAnalyticsProps = {
  onBack?: () => void;
};

export default function FocusAnalytics({ onBack }: FocusAnalyticsProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    navigate("/study");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-border/60 bg-card"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold">Focus Insights</h1>
            <p className="text-sm text-muted-foreground">Focused metrics and session history from Ekagra timer sessions.</p>
          </div>
        </header>

        <FocusAnalyticsPanel showTabs />
      </div>
    </div>
  );
}
