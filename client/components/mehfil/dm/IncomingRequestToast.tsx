import type { IncomingRequest } from "@/store/dmStore";

interface IncomingRequestToastProps {
  request: IncomingRequest;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingRequestToast({ request, onAccept, onDecline }: IncomingRequestToastProps) {
  return (
    <div className="fixed bottom-4 left-4 z-[90] w-[320px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{request.fromUserName} wants to chat</p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">From {request.context.type}: {request.context.preview || "No preview"}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onDecline}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="flex-1 rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
