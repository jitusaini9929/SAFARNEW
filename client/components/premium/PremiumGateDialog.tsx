import { useNavigate } from "react-router-dom";
import { PremiumEmoji } from "@/components/PremiumEmoji";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PremiumGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PremiumGateDialog({ open, onOpenChange }: PremiumGateDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <PremiumEmoji name="lock" className="h-6 w-6" />
            <DialogTitle>Connect is Premium</DialogTitle>
          </div>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            Start private 1:1 chats with fellow Safarites from Mehfil posts. Upgrade to send connection
            requests and reach out directly.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              navigate("/premium/mehfil-dm");
            }}
          >
            View plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
