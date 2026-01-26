import React from 'react';
import { Topic } from '@/store/chatStore';

interface TopicTabsProps {
    topics: Topic[];
    currentTopicId: string;
    onTopicChange: (topicId: string) => void;
}

const TopicTabs: React.FC<TopicTabsProps> = ({
    topics,
    currentTopicId,
    onTopicChange,
}) => {
    return (
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
            {topics.map((topic) => (
                <button
                    key={topic.id}
                    onClick={() => onTopicChange(topic.id)}
                    className={`px-6 py-3 rounded-full font-semibold whitespace-nowrap transition-all shadow-md ${currentTopicId === topic.id
                            ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground scale-105'
                            : 'glass-high hover:bg-primary/10 hover:scale-105'
                        }`}
                    aria-label={`Switch to ${topic.name} topic`}
                >
                    {topic.name}
                    <span className="ml-2 text-xs opacity-75">({topic.messageCount})</span>
                </button>
            ))}
        </div>
    );
};

export default TopicTabs;
