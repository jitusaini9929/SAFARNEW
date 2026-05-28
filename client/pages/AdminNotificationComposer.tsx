import { useMemo, useState } from "react";
import M3TopNavbar from "@/components/M3TopNavbar";
import { API_BASE, apiFetch } from "@/utils/apiFetch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminNotificationComposer() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [isSending, setIsSending] = useState(false);

  const canSubmit = useMemo(() => {
    return title.trim().length > 0 && body.trim().length > 0 && deepLink.trim().length > 0 && !isSending;
  }, [title, body, deepLink, isSending]);

  const sendBroadcast = async () => {
    if (!canSubmit) return;

    setIsSending(true);
    try {
      const response = await apiFetch(`${API_BASE}/admin/notifications/broadcast`, {
        method: "POST",
        body: JSON.stringify({
          type: "announcements",
          channel: "announcements",
          priority: "high",
          title: title.trim(),
          body: body.trim(),
          deepLink: deepLink.trim(),
          broadcast: true,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to broadcast notification");
      }

      const sentCount = Array.isArray(payload?.results)
        ? payload.results.filter((result: any) => result?.success === true).length
        : 0;

      toast.success(`Broadcast sent to ${sentCount} device(s).`);
      setTitle("");
      setBody("");
      setDeepLink("");
    } catch (error: any) {
      toast.error(error?.message || "Failed to broadcast notification");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mehfil-m3 min-h-[100dvh] bg-slate-50 text-slate-900 dark:bg-background dark:text-foreground">
      <M3TopNavbar moduleName="PROFILE" homeRoute="/dashboard" />
      <main className="mx-auto w-full max-w-3xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Admin Notification Composer</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Send a broadcast push notification to all active devices.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-broadcast-title">Title</Label>
              <Input
                id="admin-broadcast-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Enter notification title"
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-broadcast-body">Body</Label>
              <Textarea
                id="admin-broadcast-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Enter notification body"
                rows={5}
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-broadcast-deeplink">Deep Link</Label>
              <Input
                id="admin-broadcast-deeplink"
                value={deepLink}
                onChange={(event) => setDeepLink(event.target.value)}
                placeholder="safar://..."
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={!canSubmit}>Review & Broadcast</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm broadcast notification</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will send a push notification to all active devices. Please confirm the
                    title, body, and deep link are correct before continuing.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={sendBroadcast} disabled={isSending}>
                    {isSending ? "Sending..." : "Yes, send broadcast"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      </main>
    </div>
  );
}
