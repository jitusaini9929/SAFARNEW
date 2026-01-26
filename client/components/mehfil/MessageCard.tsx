import React, { useState } from "react";
import { Message } from "@/store/chatStore";
import {
  MoreHorizontal,
  MessageCircle,
  Share2,
  CheckCircle,
  Heart,
  Send,
} from "lucide-react";

interface MessageCardProps {
  message: Message;
  onRelate: (option: number) => void;
  userVote?: number;
}

const MessageCard: React.FC<MessageCardProps> = ({
  message,
  onRelate,
  userVote,
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(
    userVote || null,
  );

  // Comment state
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState([
    { id: 1, author: "Sarah J.", text: "Totally relate to this!" },
    { id: 2, author: "Mike T.", text: "Hang in there, it gets better." }
  ]);

  const handleAddComment = () => {
    if (newComment.trim()) {
      setComments([
        ...comments,
        {
          id: Date.now(),
          author: "You",
          text: newComment
        }
      ]);
      setNewComment("");
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const [pollOptions, setPollOptions] = useState([
    { text: "Big mood. Same here.", percentage: 78 },
    { text: "I'm actually managing okay.", percentage: 22 },
  ]);

  const handleVote = (option: number) => {
    if (selectedOption === null) {
      setSelectedOption(option);
      onRelate(option);

      // Update percentages visually
      setPollOptions(prev => {
        const newOptions = [...prev];
        const votedIndex = option - 1; // option is 1-based
        const otherIndex = votedIndex === 0 ? 1 : 0;

        // Simple visual update: +1% to voted, -1% to other
        if (newOptions[votedIndex].percentage < 100) {
          newOptions[votedIndex].percentage += 1;
          newOptions[otherIndex].percentage -= 1;
        }
        return newOptions;
      });
    }
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-indigo-500",
      "bg-rose-400",
      "bg-amber-400",
      "bg-emerald-400",
      "bg-blue-500",
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  return (
    <article className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full ${getAvatarColor(message.author)} flex items-center justify-center text-white text-xs font-bold shadow-md`}
          >
            {getInitials(message.author)}
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {message.author}
            </h3>
            <p className="text-[10px] text-muted-foreground font-medium">
              Postgraduate • {formatTime(message.createdAt)}
            </p>
          </div>
        </div>
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Message Text */}
      <p className="text-sm text-foreground leading-relaxed mb-6 font-normal">
        {message.text}
      </p>

      {/* Image (if present) */}
      {message.imageUrl && (
        <img
          src={message.imageUrl}
          alt="Message attachment"
          className="rounded-2xl mb-6 max-w-full max-h-64 object-cover shadow-md"
        />
      )}

      {/* Poll/Relate Section */}
      <div className="bg-muted/40 rounded-2xl p-4 border border-white/20">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
            <span className="text-sm">📊</span>
            Relate Check
          </span>
        </div>

        <div className="space-y-2">
          {/* Option 1 */}
          <div
            className="relative h-12 group cursor-pointer rounded-xl overflow-hidden"
            onClick={() => handleVote(1)}
          >
            {/* Background bar */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-teal-400 to-emerald-400 rounded-xl transition-all"
              style={{ width: `${pollOptions[0].percentage}%` }}
            />
            {/* Content layer */}
            <div className="relative h-full flex items-center justify-between px-4 z-10">
              <span className="text-xs font-bold text-white drop-shadow-md flex items-center gap-2">
                {selectedOption === 1 && (
                  <CheckCircle className="w-4 h-4 text-white" />
                )}
                {pollOptions[0].text}
              </span>
              <span className="text-xs font-black text-foreground dark:text-white drop-shadow-md ml-4">
                {pollOptions[0].percentage}%
              </span>
            </div>
          </div>

          {/* Option 2 */}
          <div
            className="relative h-12 group cursor-pointer bg-white/30 dark:bg-black/20 rounded-xl overflow-hidden"
            onClick={() => handleVote(2)}
          >
            {/* Background bar */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 rounded-xl transition-all"
              style={{ width: `${pollOptions[1].percentage}%` }}
            />
            {/* Content layer */}
            <div className="relative h-full flex items-center justify-between px-4 z-10">
              <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                {selectedOption === 2 && (
                  <CheckCircle className="w-4 h-4 text-primary" />
                )}
                {pollOptions[1].text}
              </span>
              <span className="text-xs font-black text-foreground dark:text-white drop-shadow-md ml-4">
                {pollOptions[1].percentage}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-6 flex items-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          {comments.length > 0 ? `${comments.length} Comments` : 'Comment'}
        </button>
        <button className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors ml-auto">
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
          <div className="space-y-3 mb-4 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-2 text-xs">
                <div className="font-bold text-primary shrink-0">{comment.author}</div>
                <div className="text-muted-foreground">{comment.text}</div>
              </div>
            ))}
            {comments.length === 0 && (
              <div className="text-center text-[10px] text-muted-foreground italic py-2">
                No comments yet. Be the first to say something!
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newComment.trim()) {
                  handleAddComment();
                }
              }}
              placeholder="Write a comment..."
              className="flex-1 bg-muted/50 border-0 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary/50 focus:outline-none"
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="p-2 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </article>
  );
};

export default MessageCard;
