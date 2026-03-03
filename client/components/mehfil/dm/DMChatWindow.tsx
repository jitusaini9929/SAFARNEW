import { useState } from "react";
import { motion } from "framer-motion";
import { useDMStore } from "@/store/dmStore";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ShareHandlePanel } from "./ShareHandlePanel";

export function DMChatWindow() {
  const activeChat = useDMStore((state) => state.activeChat);
  const currentUserId = useDMStore((state) => state.currentUserId);
  const messages = useDMStore((state) => state.messages);
  const sendMessage = useDMStore((state) => state.sendMessage);
  const shareHandle = useDMStore((state) => state.shareHandle);
  const closeChat = useDMStore((state) => state.closeChat);
  const [showHandlePanel, setShowHandlePanel] = useState(false);

  if (!activeChat) return null;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 20, opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-6 right-6 z-[85] flex h-[550px] w-[380px] flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#1e293b] overflow-hidden transition-colors duration-300"
    >
      <ChatHeader
        otherUserName={activeChat.otherUserName}
        onClose={closeChat}
        onToggleHandlePanel={() => setShowHandlePanel((prev) => !prev)}
        showHandlePanel={showHandlePanel}
      />

      <MessageList messages={messages} currentUserId={currentUserId} />

      <ShareHandlePanel
        show={showHandlePanel}
        onShare={(platform, handle) => {
          shareHandle(activeChat.roomId, platform, handle);
        }}
      />

      <MessageInput onSend={(text) => sendMessage(activeChat.roomId, text)} />
    </motion.div>
  );
}
