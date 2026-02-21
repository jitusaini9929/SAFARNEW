import React, { useState, useEffect } from "react";
import { Thought } from "@/store/mehfilStore";
import {
  Heart,
  MoreHorizontal,
  MessageCircle,
  Share2,
  Bookmark,
  Flag,
  Send,
  Trash2,
  Pencil,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { authService } from "@/utils/authService";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const API_URL = import.meta.env.VITE_API_URL || "/api";

interface ThoughtCardProps {
  thought: Thought;
  onReact: () => void;
  onEdit?: (thoughtId: string, content: string) => void;
  onDelete?: () => void;
  hasReacted: boolean;
  isOwnThought?: boolean;
}

interface Comment {
  id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  created_at: string;
  user_id: string;
}

const ThoughtCard: React.FC<ThoughtCardProps> = ({
  thought,
  onReact,
  onEdit,
  onDelete,
  hasReacted,
  isOwnThought = false,
}) => {
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editText, setEditText] = useState(thought.content);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const [isSaved, setIsSaved] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("spam");


  const getCurrentUserId = async () => {
    const auth = await authService.getCurrentUser();
    const currentUser = (auth as any)?.user ?? auth;
    return currentUser?.id as string | undefined;
  };

  // Check save + friendship status on mount
  useEffect(() => {
    checkSaveStatus();
  }, [thought.id, thought.userId, thought.isAnonymous]);

  useEffect(() => {
    setEditText(thought.content);
  }, [thought.content]);

  // Fetch comments on mount
  useEffect(() => {
    fetchComments();
  }, [thought.id]);

  // ── helpers ──────────────────────────────────────────
  const toComment = (comment: any): Comment => ({
    id: comment.id,
    author_name: comment.authorName ?? comment.author_name ?? "Unknown",
    author_avatar: comment.authorAvatar ?? comment.author_avatar ?? null,
    content: comment.content,
    created_at: comment.createdAt ?? comment.created_at,
    user_id: comment.userId ?? comment.user_id,
  });

  const checkSaveStatus = async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      const response = await fetch(`${API_URL}/mehfil/interactions/save/${thought.id}`);
      if (response.ok) {
        const data = await response.json();
        setIsSaved(data.saved);
      }
    } catch (error) {
      console.error("Error checking save status:", error);
    }
  };



  const fetchComments = async () => {
    setIsLoadingComments(true);
    try {
      const response = await fetch(`${API_URL}/mehfil/interactions/comments/${thought.id}`);
      if (response.ok) {
        const data = await response.json();
        setComments(Array.isArray(data?.comments) ? data.comments.map(toComment) : []);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
      toast.error("Failed to load comments");
    } finally {
      setIsLoadingComments(false);
    }
  };

  // ── actions ──────────────────────────────────────────

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        toast.error("You must be logged in to comment");
        return;
      }
      const response = await fetch(`${API_URL}/mehfil/interactions/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thoughtId: thought.id, content: commentText }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.comment) {
          setComments((prev) => [...prev, toComment(data.comment)]);
        }
        setCommentText("");
        toast.success("Comment posted!");
      } else {
        throw new Error("Failed to post comment");
      }
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
    }
  };

  const handleSave = async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        toast.error("You must be logged in to save posts");
        return;
      }
      const response = await fetch(`${API_URL}/mehfil/interactions/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thoughtId: thought.id }),
      });
      if (response.ok) {
        const data = await response.json();
        setIsSaved(data.saved);
        toast.success(data.saved ? "Post saved!" : "Post unsaved");
      }
    } catch (error) {
      console.error("Error saving post:", error);
      toast.error("Failed to save post");
    }
  };

  const handleReport = async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        toast.error("You must be logged in to report");
        return;
      }
      const response = await fetch(`${API_URL}/mehfil/interactions/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thoughtId: thought.id, reason: reportReason }),
      });
      if (response.ok) {
        toast.success(
          "Report submitted. Thank you for keeping the community safe."
        );
        setIsReportDialogOpen(false);
      } else {
        throw new Error("Failed to submit report");
      }
    } catch (error) {
      console.error("Error reporting post:", error);
      toast.error("Failed to submit report");
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/mehfil/${thought.id}`;
    try {
      const userId = await getCurrentUserId();
      if (userId) {
        fetch(`${API_URL}/mehfil/interactions/share`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ thoughtId: thought.id, platform: "share" }),
        });
      }

      if (navigator.share) {
        await navigator.share({
          title: "Mehfil",
          text: thought.content.slice(0, 120),
          url: shareUrl,
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard!");
        return;
      }

      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast.success("Link copied to clipboard!");
    } catch (error) {
      console.error("Error sharing:", error);
      toast.error("Failed to share");
    }
  };

  const handleEdit = () => {
    const trimmed = editText.trim();
    if (trimmed.length < 15) {
      toast.error("Post must be at least 15 characters");
      return;
    }
    if (trimmed.length > 5000) {
      toast.error("Post must be under 5000 characters");
      return;
    }
    onEdit?.(thought.id, trimmed);
    setIsEditDialogOpen(false);
    toast.success("Post update submitted");
  };



  // ── formatting helpers ──────────────────────────────

  const formatTime = (dateInput: string | Date) => {
    const date = new Date(dateInput);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getInitials = (name: string) => {
    return name ? name.substring(0, 2).toUpperCase() : "??";
  };

  const categoryLabel = thought.category === "REFLECTIVE" ? "Thoughts" : "Academic Hall";
  const categoryClass =
    thought.category === "REFLECTIVE"
      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
      : "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300";

  // ── render ──────────────────────────────────────────

  return (
    <>
      <article className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow duration-300">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-11 h-11 ring-2 ring-transparent hover:ring-teal-500/30 transition-all">
              <AvatarImage
                src={thought.authorAvatar || undefined}
                alt={thought.authorName}
              />
              <AvatarFallback className="bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 font-bold text-sm">
                {getInitials(thought.authorName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-0.5">
                {thought.authorName}
                {isOwnThought && (
                  <span className="ml-2 text-[10px] bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-full font-semibold">
                    You
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-medium">
                  {formatTime(thought.createdAt)}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${categoryClass}`}>
                  {categoryLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Three-dot menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 -mr-2 text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={handleSave}
              >
                <Bookmark
                  className={`w-4 h-4 ${isSaved ? "fill-current text-teal-500" : ""}`}
                />
                <span>{isSaved ? "Unsave Post" : "Save Post"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </DropdownMenuItem>

              {isOwnThought && onDelete && (
                <>
                  <DropdownMenuItem
                    className="cursor-pointer gap-2"
                    onClick={() => setIsEditDialogOpen(true)}
                  >
                    <Pencil className="w-4 h-4" />
                    <span>Edit Post</span>
                  </DropdownMenuItem>
                  <Separator className="my-1" />
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-900/20"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Post</span>
                  </DropdownMenuItem>
                </>
              )}

              <Separator className="my-1" />
              <DropdownMenuItem
                className="cursor-pointer gap-2 text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-900/20"
                onClick={() => setIsReportDialogOpen(true)}
              >
                <Flag className="w-4 h-4" />
                <span>Report</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Thought Content */}
        <p className="text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed mb-5 font-normal whitespace-pre-wrap">
          {thought.content}
        </p>

        {/* Image (if present) */}
        {thought.imageUrl && (
          <div className="rounded-2xl overflow-hidden mb-6 shadow-sm border border-slate-100 dark:border-slate-800">
            <img
              src={thought.imageUrl}
              alt="Thought attachment"
              className="w-full max-h-[400px] object-cover hover:scale-105 transition-transform duration-700"
            />
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={onReact}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${hasReacted
                ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-2 ring-rose-200 dark:ring-rose-500/20"
                : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-rose-500"
                }`}
            >
              <Heart
                className={`w-4 h-4 transition-all ${hasReacted ? "fill-current" : ""}`}
              />
              {hasReacted ? "Relatable" : "Relatable?"} {thought.relatableCount > 0 && `(${thought.relatableCount})`}
            </button>

            <button
              onClick={() => setIsCommentsOpen(!isCommentsOpen)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${isCommentsOpen
                ? "bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 ring-2 ring-teal-200 dark:ring-teal-500/20"
                : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-teal-500"
                }`}
            >
              <MessageCircle className="w-4 h-4" />
              Comment {Math.max(thought.commentsCount || 0, comments.length) > 0 && `(${Math.max(thought.commentsCount || 0, comments.length)})`}
            </button>
          </div>
        </div>

        {/* Comment Section (Collapsible) */}
        {isCommentsOpen && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-4 mb-4">
              {isLoadingComments ? (
                <p className="text-center text-xs text-slate-400 py-2">
                  Loading comments...
                </p>
              ) : comments.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-2">
                  No comments yet. Be the first!
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={comment.author_avatar} />
                      <AvatarFallback className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {getInitials(comment.author_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl rounded-tl-none p-3">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-200">
                          {comment.author_name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatTime(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Input */}
            <div className="flex gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs bg-teal-100 text-teal-700">
                  Me
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 relative">
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePostComment()}
                  placeholder="Write a comment..."
                  className="pr-10 rounded-full bg-slate-50 dark:bg-slate-800/50 border-transparent focus:border-teal-500 focus:ring-teal-500/20"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-full"
                  onClick={handlePostComment}
                  disabled={!commentText.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </article>

      {/* Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Post</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup value={reportReason} onValueChange={setReportReason}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="spam" id="spam" />
                <Label htmlFor="spam">Spam or misleading</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="harassment" id="harassment" />
                <Label htmlFor="harassment">Harassment or hate speech</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inappropriate" id="inappropriate" />
                <Label htmlFor="inappropriate">Inappropriate content</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other">Other</Label>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReport}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post?</DialogTitle>
          </DialogHeader>
          <p className="py-4 text-slate-600 dark:text-slate-300">
            Are you sure you want to delete this post? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                onDelete?.();
                setIsDeleteDialogOpen(false);
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value.slice(0, 5000))}
              className="w-full min-h-[160px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              placeholder="Update your post..."
            />
            <div className="mt-2 text-right text-[11px] text-slate-400">
              {editText.length} / 5000
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} className="bg-teal-600 hover:bg-teal-700 text-white">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ThoughtCard;
