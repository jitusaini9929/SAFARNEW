import React from 'react';
import MessageCard from './MessageCard';
import { Message } from '@/store/chatStore';

interface MessageListProps {
    messages: Message[];
    onRelate: (messageId: string) => void;
    onFlag: (messageId: string, reason: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({
    messages,
    onRelate,
    onFlag,
}) => {
    return (
        <div className="space-y-4 mb-8 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
            {messages.length === 0 ? (
                <div className="text-center py-16 glass-high rounded-2xl">
                    <div className="text-6xl mb-4">💬</div>
                    <p className="text-muted-foreground text-lg font-medium">
                        No messages yet. Be the first to share your thoughts!
                    </p>
                </div>
            ) : (
                messages.map((message) => (
                    <MessageCard
                        key={message.id}
                        message={message}
                        onRelate={() => onRelate(message.id)}
                        onFlag={(reason) => onFlag(message.id, reason)}
                    />
                ))
            )}
        </div>
    );
};

export default MessageList;
