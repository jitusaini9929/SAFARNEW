import { Link } from "react-router-dom";
import { PremiumEmoji } from "@/components/PremiumEmoji";
import { Button } from "@/components/ui/button";

export default function MehfilDmPaywall() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="mx-auto max-w-2xl space-y-8 pt-8">
        <header className="space-y-3 text-center">
          <div className="flex justify-center">
            <PremiumEmoji name="lock" className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Mehfil Connect Premium</h1>
          <p className="text-muted-foreground">
            Private 1:1 chats with fellow students — plans and pricing coming soon.
          </p>
        </header>

        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">What you unlock</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Send connection requests from Mehfil posts</li>
            <li>Start ephemeral private chats with other Safarites</li>
            <li>Share social handles during a live connection</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Pricing and checkout will be available here once the plan is finalized.
          </p>
        </div>

        <div className="flex justify-center">
          <Button asChild variant="outline">
            <Link to="/mehfil">Back to Mehfil</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
