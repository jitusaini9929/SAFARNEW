import type { DMMessage } from "@/store/dmStore";

interface MessageListProps {
  messages: DMMessage[];
  currentUserId: string | null;
}

function getHandleLink(platform: "linkedin" | "instagram" | "discord", handle: string): string | null {
  if (platform === "instagram") return `https://instagram.com/${handle}`;
  if (platform === "linkedin") return `https://linkedin.com/in/${handle}`;
  return null;
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-[#0f172a]/50 scrollbar-hide">
      {messages.length === 0 ? (
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 py-6">No messages yet.</p>
      ) : (
        messages.map((message) => {
          if (message.kind === "system") {
            return (
              <div key={message.id} className="flex justify-center my-2">
                <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{message.text}</span>
              </div>
            );
          }

          const isMe = message.fromUserId === currentUserId;

          if (message.kind === "handle") {
            const handle = message.handle || "";
            const platform = message.platform || "discord";
            const link = getHandleLink(platform, handle);
            return (
              <div key={message.id} className={`flex items-end gap-2 group ${isMe ? "justify-end" : ""}`}>
                {!isMe && (
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 dark:bg-indigo-500/10 flex items-center justify-center text-[10px] text-indigo-600 dark:text-indigo-400 font-bold shrink-0 mb-1">
                    {message.fromUserName?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl p-3 shadow-sm ${isMe ? "bg-teal-500 text-white rounded-br-none shadow-md shadow-teal-500/20" : "bg-white dark:bg-[#283548] text-slate-700 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-transparent"}`}>
                  <p className="font-semibold text-xs opacity-90">Handle Shared</p>
                  <p className="mt-1 text-sm leading-relaxed">{platform}: @{handle}</p>
                  {link ? (
                    <a href={link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11px] font-bold opacity-80 hover:opacity-100 hover:underline">
                      {`Open ${platform} ->`}
                    </a>
                  ) : null}
                </div>
              </div>
            );
          }

          return (
            <div key={message.id} className={`flex items-end gap-2 group ${isMe ? "justify-end" : ""}`}>
              {!isMe && (
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 dark:bg-indigo-500/10 flex items-center justify-center text-[10px] text-indigo-600 dark:text-indigo-400 font-bold shrink-0 mb-1">
                  {message.fromUserName?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl py-2.5 px-4 shadow-sm ${isMe ? "bg-teal-500 text-white rounded-br-none shadow-md shadow-teal-500/20" : "bg-white dark:bg-[#283548] text-slate-700 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-transparent"}`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
