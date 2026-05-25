import React, { Suspense, useState } from "react";
import { Send, Smile } from "lucide-react";

const LazyEmojiPicker = React.lazy(async () => {
  const module = await import("@/components/ui/EmojiPicker");
  return { default: module.EmojiPicker };
});

interface MessageInputProps {
  onSend: (text: string) => void;
}

export function MessageInput({ onSend }: MessageInputProps) {
  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const submit = () => {
    const normalized = text.trim();
    if (!normalized) return;
    onSend(normalized);
    setText("");
  };

  const handleEmojiSelect = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="p-3 bg-white dark:bg-card border-t border-slate-200 dark:border-border shrink-0">
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="Type a message..."
            className="w-full bg-slate-100 dark:bg-muted border border-transparent dark:border-border rounded-xl py-3 pl-4 pr-10 text-sm focus:ring-2 focus:ring-primary focus:border-transparent dark:text-foreground placeholder-slate-400 transition-all shadow-inner outline-none"
            type="text"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 transition-colors"
              aria-label="Insert emoji"
            >
              <Smile className="h-5 w-5" />
            </button>
            {showEmojiPicker ? (
              <Suspense fallback={null}>
                <LazyEmojiPicker
                  open={showEmojiPicker}
                  onClose={() => setShowEmojiPicker(false)}
                  onSelect={handleEmojiSelect}
                  position="top"
                />
              </Suspense>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim()}
          className="safar-btn-primary w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 group disabled:opacity-50"
          aria-label="Send message"
        >
          <Send className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
      <div className="text-[10px] text-center text-slate-400 dark:text-slate-600 mt-2 font-medium">
        Messages disappear after 24 hours
      </div>
    </div>
  );
}
