import React, { useState, useEffect } from 'react';
import { Bookmark, BarChart3, Shield, X, Loader2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { authService } from '@/utils/authService';
import { toast } from 'sonner';
import { Thought } from '@/store/mehfilStore';
import ThoughtCard from './ThoughtCard';
import { useDMStore } from '@/store/dmStore';

const API_URL = import.meta.env.VITE_API_URL || "/api";

export type MehfilSidebarView = 'connections' | 'saved' | 'analytics' | 'privacy';
type SidebarView = MehfilSidebarView | null;

interface UserAnalytics {
  totalThoughts: number;
  totalReactions: number;
  totalComments: number;
  totalSaves: number;
  totalShares: number;
  joinedDate: string;
}

interface MehfilSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: MehfilSidebarView;
}

const MehfilSidebar: React.FC<MehfilSidebarProps> = ({ isOpen, onClose, initialView = 'connections' }) => {
  const [activeView, setActiveView] = useState<SidebarView>(null);
  const [savedPosts, setSavedPosts] = useState<Thought[]>([]);
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set());
  const incomingRequests = useDMStore((state) => state.incomingRequests);
  const activeChat = useDMStore((state) => state.activeChat);
  const acceptRequest = useDMStore((state) => state.acceptRequest);
  const declineRequest = useDMStore((state) => state.declineRequest);
  const pendingRequestsCount = incomingRequests.length;

  useEffect(() => {
    if (isOpen && !activeView) {
      setActiveView(initialView);
    }
  }, [isOpen, activeView, initialView]);

  useEffect(() => {
    if (activeView === 'saved') {
      fetchSavedPosts();
    } else if (activeView === 'analytics') {
      fetchAnalytics();
    }
  }, [activeView]);



  const fetchSavedPosts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/mehfil/saved-posts`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSavedPosts(data.posts);
        setUserReactions(new Set(data.reactedThoughtIds || []));
      }
    } catch (error) {
      console.error('Error fetching saved posts:', error);
      toast.error('Failed to load saved posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/mehfil/analytics`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };



  const handleReact = async (thoughtId: string) => {
    // Toggle reaction optimistically
    setUserReactions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(thoughtId)) {
        newSet.delete(thoughtId);
      } else {
        newSet.add(thoughtId);
      }
      return newSet;
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside className="fixed right-0 top-0 bottom-0 w-full sm:w-[520px] bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-hidden flex flex-col border-l border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Mehfil Hub</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 overflow-x-auto scrollbar-hide">
          <Button
            variant={activeView === 'connections' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('connections')}
            aria-label="Connection requests"
            className="min-w-fit gap-2 action-btn-nowrap relative"
          >
            <Bell className="w-4 h-4" />
            <span className="action-label-mobile-hidden">Connections</span>
            {pendingRequestsCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white">
                {pendingRequestsCount}
              </span>
            )}
          </Button>
          <Button
            variant={activeView === 'saved' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('saved')}
            aria-label="Saved posts"
            className="min-w-fit gap-2 action-btn-nowrap"
          >
            <Bookmark className="w-4 h-4" />
            <span className="action-label-mobile-hidden">Saved</span>
          </Button>
          <Button
            variant={activeView === 'analytics' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('analytics')}
            aria-label="Activity analytics"
            className="min-w-fit gap-2 action-btn-nowrap"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="action-label-mobile-hidden">Activity</span>
          </Button>
          <Button
            variant={activeView === 'privacy' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('privacy')}
            aria-label="Privacy guidelines"
            className="min-w-fit gap-2 action-btn-nowrap"
          >
            <Shield className="w-4 h-4" />
            <span className="action-label-mobile-hidden">Privacy</span>
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-blend p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
          ) : (
            <>
              {activeView === 'connections' && (
                <div className="space-y-5">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Connections
                  </h3>

                  {activeChat && (
                    <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-700/60 dark:bg-teal-900/20">
                      <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">Active Chat</p>
                      <p className="mt-1 text-sm text-teal-800 dark:text-teal-200">
                        Chatting with <span className="font-bold">{activeChat.otherUserName}</span>.
                      </p>
                      <p className="mt-1 text-xs text-teal-700/80 dark:text-teal-300/80">
                        Use the chat window at the bottom-right to continue.
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Pending Requests ({pendingRequestsCount})
                    </p>

                    {pendingRequestsCount === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                        No pending connection requests right now.
                      </div>
                    ) : (
                      incomingRequests.map((request) => (
                        <div
                          key={request.requestId}
                          className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/40"
                        >
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {request.fromUserName} wants to chat
                          </p>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                            From {request.context.type}: {request.context.preview || 'No preview'}
                          </p>
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => declineRequest(request.requestId)}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
                            >
                              Decline
                            </button>
                            <button
                              type="button"
                              onClick={() => acceptRequest(request.requestId)}
                              className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              Accept & Chat
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Saved Posts View */}
              {activeView === 'saved' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                    Saved Posts ({savedPosts.length})
                  </h3>

                  {savedPosts.length === 0 ? (
                    <div className="text-center py-12">
                      <Bookmark className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                      <p className="text-slate-500 dark:text-slate-400 text-sm">
                        No saved posts yet. Save posts by clicking the bookmark icon!
                      </p>
                    </div>
                  ) : (
                    savedPosts.map((thought) => (
                      <ThoughtCard
                        key={thought.id}
                        thought={thought}
                        onReact={() => handleReact(thought.id)}
                        hasReacted={userReactions.has(thought.id)}
                        isOwnThought={false}
                      />
                    ))
                  )}
                </div>
              )}

              {/* Analytics View */}
              {activeView === 'analytics' && analytics && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                    Your Activity
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950/30 dark:to-teal-900/30 border border-teal-200 dark:border-teal-800">
                      <p className="text-3xl font-bold text-teal-700 dark:text-teal-400">
                        {analytics.totalThoughts}
                      </p>
                      <p className="text-xs text-teal-600 dark:text-teal-500 font-medium mt-1">
                        Total Thoughts
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/30 dark:to-rose-900/30 border border-rose-200 dark:border-rose-800">
                      <p className="text-3xl font-bold text-rose-700 dark:text-rose-400">
                        {analytics.totalReactions}
                      </p>
                      <p className="text-xs text-rose-600 dark:text-rose-500 font-medium mt-1">
                        Reactions Given
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800">
                      <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                        {analytics.totalComments}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-500 font-medium mt-1">
                        Comments Posted
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30 border border-amber-200 dark:border-amber-800">
                      <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">
                        {analytics.totalSaves}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-500 font-medium mt-1">
                        Posts Saved
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border border-purple-200 dark:border-purple-800">
                      <p className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                        {analytics.totalShares}
                      </p>
                      <p className="text-xs text-purple-600 dark:text-purple-500 font-medium mt-1">
                        Shares
                      </p>
                    </div>


                  </div>

                  <Separator className="my-6" />

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-slate-900 dark:text-white">Member since:</span>{' '}
                      {new Date(analytics.joinedDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Privacy Policy View */}
              {activeView === 'privacy' && (
                <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                    Mehfil Privacy Policy
                  </h3>

                  <section>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">1. Community Guidelines</h4>
                    <p className="leading-relaxed">
                      Mehfil is a judgment-free space for sharing thoughts and experiences. We encourage
                      authentic expression while maintaining respect for all community members.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">2. Content Privacy</h4>
                    <p className="leading-relaxed">
                      • All posts are visible to other Mehfil users<br />
                      • You can delete your posts at any time<br />
                      • Saved posts are private to you<br />
                      • We never sell or share your data with third parties
                    </p>
                  </section>

                  <section>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">3. Data Collection</h4>
                    <p className="leading-relaxed">
                      We collect only essential data: your posts, comments, and reactions.
                      This data helps improve your experience and is stored securely.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">4. Moderation</h4>
                    <p className="leading-relaxed">
                      Users can report content that violates guidelines. Our team reviews reports to maintain
                      a safe and supportive community environment.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">5. Your Rights</h4>
                    <p className="leading-relaxed">
                      • Request data deletion<br />
                      • Export your data<br />
                      • Report inappropriate content
                    </p>
                  </section>

                  <Separator className="my-6" />

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Last updated: February 2026<br />
                    For questions, contact: support@safar-app.com
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
};

export default MehfilSidebar;
