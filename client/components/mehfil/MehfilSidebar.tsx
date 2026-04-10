import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bookmark, Shield, X, Loader2, Bell, MessageSquare, Heart, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Thought } from '@/store/mehfilStore';
import ThoughtCard from './ThoughtCard';
import { useDMStore } from '@/store/dmStore';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/utils/apiFetch';

const API_URL = import.meta.env.VITE_API_URL || "/api";

export type MehfilSidebarView = 'connections' | 'saved' | 'activity' | 'privacy';
type SidebarView = MehfilSidebarView | null;

type ActivityType = 'post' | 'comment' | 'like';
interface ActivityItem {
  type: ActivityType;
  createdAt: string;
  thoughtId?: string;
  comment?: string;
  thought?: {
    id: string;
    authorName: string;
    category: string;
    content: string;
  } | null;
}

interface MehfilSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: MehfilSidebarView;
}

const MehfilSidebar: React.FC<MehfilSidebarProps> = ({ isOpen, onClose, initialView = 'connections' }) => {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, status } = useAuth();
  const [activeView, setActiveView] = useState<SidebarView>(null);
  const [savedPosts, setSavedPosts] = useState<Thought[]>([]);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [activityFilter, setActivityFilter] = useState<'all' | ActivityType>('all');
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
    if (!isAuthenticated) {
      setSavedPosts([]);
      setActivityItems([]);
      setLoading(false);
      return;
    }

    if (activeView === 'saved') {
      void fetchSavedPosts();
    } else if (activeView === 'activity') {
      void fetchActivity();
    }
  }, [activeView, isAuthenticated]);

  const fetchSavedPosts = async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const page = 1;
      const limit = 50;
      const response = await apiFetch(`${API_URL}/mehfil/saved-posts?page=${page}&limit=${limit}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSavedPosts(data.posts);
        setUserReactions(new Set(data.reactedThoughtIds || []));
      } else if (response.status === 401 || response.status === 403) {
        setSavedPosts([]);
        setUserReactions(new Set());
      }
    } catch (error) {
      console.error('Error fetching saved posts:', error);
      toast.error(t('mehfil.toast.save_error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchActivity = async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const response = await apiFetch(`${API_URL}/mehfil/activity`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setActivityItems(Array.isArray(data?.items) ? data.items : []);
      } else if (response.status === 401 || response.status === 403) {
        setActivityItems([]);
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
      toast.error(t('sidebar.activity.error'));
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
      <aside className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] md:w-[520px] bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-hidden flex flex-col border-l border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{t('sidebar.hub_title')}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 overflow-x-auto scrollbar-hide">
          <Button
            variant={activeView === 'connections' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('connections')}
            aria-label={t('sidebar.tabs.connections')}
            className="min-w-fit gap-2 action-btn-nowrap relative"
          >
            <Bell className="w-4 h-4" />
            <span className="action-label-mobile-hidden">{t('sidebar.tabs.connections')}</span>
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
            aria-label={t('sidebar.tabs.saved')}
            className="min-w-fit gap-2 action-btn-nowrap"
          >
            <Bookmark className="w-4 h-4" />
            <span className="action-label-mobile-hidden">{t('sidebar.tabs.saved')}</span>
          </Button>
          <Button
            variant={activeView === 'activity' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('activity')}
            aria-label={t('sidebar.tabs.activity')}
            className="min-w-fit gap-2 action-btn-nowrap"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="action-label-mobile-hidden">{t('sidebar.tabs.activity')}</span>
          </Button>
          <Button
            variant={activeView === 'privacy' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('privacy')}
            aria-label={t('sidebar.tabs.privacy')}
            className="min-w-fit gap-2 action-btn-nowrap"
          >
            <Shield className="w-4 h-4" />
            <span className="action-label-mobile-hidden">{t('sidebar.tabs.privacy')}</span>
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-blend p-3 sm:p-4 md:p-6">
          {status === 'loading' ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
          ) : !isAuthenticated && activeView !== 'privacy' ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
              {t('mehfil.toasts.comment_login')}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
          ) : (
            <>
              {/* Connections View */}
              {activeView === 'connections' && (
                <div className="space-y-5">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {t('sidebar.connections.title')}
                  </h3>

                  {activeChat && (
                    <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-700/60 dark:bg-teal-900/20">
                      <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">
                        {t('sidebar.connections.active_chat')}
                      </p>
                      <p className="mt-1 text-sm text-teal-800 dark:text-teal-200">
                        {t('sidebar.connections.chatting_with', { name: activeChat.otherUserName })}
                      </p>
                      <p className="mt-1 text-xs text-teal-700/80 dark:text-teal-300/80">
                        {t('sidebar.connections.chat_hint')}
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {t('sidebar.connections.pending_requests', { count: pendingRequestsCount })}
                    </p>

                    {pendingRequestsCount === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                        {t('sidebar.connections.no_requests')}
                      </div>
                    ) : (
                      incomingRequests.map((request) => (
                        <div
                          key={request.requestId}
                          className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/40"
                        >
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {t('sidebar.connections.wants_to_chat', { name: request.fromUserName })}
                          </p>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                            {t('sidebar.connections.from_context', { type: request.context.type, preview: request.context.preview || '...' })}
                          </p>
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => declineRequest(request.requestId)}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
                            >
                              {t('sidebar.connections.decline')}
                            </button>
                            <button
                              type="button"
                              onClick={() => acceptRequest(request.requestId)}
                              className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              {t('sidebar.connections.accept')}
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
                    {t('sidebar.saved.title', { count: savedPosts.length })}
                  </h3>

                  {savedPosts.length === 0 ? (
                    <div className="text-center py-12">
                      <Bookmark className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                      <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {t('sidebar.saved.empty')}
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

              {/* Activity View */}
              {activeView === 'activity' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {t('sidebar.activity.title')}
                    </h3>
                    <div className="flex items-center gap-2">
                      {(['all', 'post', 'comment', 'like'] as const).map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setActivityFilter(filter)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${activityFilter === filter
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                        >
                          {filter === 'all'
                            ? t('sidebar.activity.filter.all')
                            : filter === 'post'
                              ? t('sidebar.activity.filter.post')
                              : filter === 'comment'
                                ? t('sidebar.activity.filter.comment')
                                : t('sidebar.activity.filter.like')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {activityItems.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                      <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {t('sidebar.activity.empty')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activityItems
                        .filter((item) => activityFilter === 'all' || item.type === activityFilter)
                        .map((item, index) => {
                          const label = item.type === 'post' ? t('sidebar.activity.labels.post') : item.type === 'comment' ? t('sidebar.activity.labels.comment') : t('sidebar.activity.labels.like');
                          const Icon = item.type === 'post' ? FileText : item.type === 'comment' ? MessageSquare : Heart;
                          const dateLabel = new Date(item.createdAt).toLocaleDateString(i18n.language === 'hi' ? 'hi-IN' : 'en-US', {
                            month: 'short',
                            day: 'numeric',
                          });

                          return (
                            <div
                              key={`${item.type}-${item.thoughtId}-${index}`}
                              className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/40"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                  <Icon className="w-4 h-4" />
                                  <span>{label}</span>
                                </div>
                                <span className="text-[10px] text-slate-400">{dateLabel}</span>
                              </div>

                              {item.comment && (
                                <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                                  “{item.comment}”
                                </p>
                              )}

                              {item.thought && (
                                <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 p-3">
                                  <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    {item.thought.category} • {item.thought.authorName}
                                  </div>
                                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                                    {item.thought.content}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* Privacy Policy View */}
              {activeView === 'privacy' && (
                <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                    {t('sidebar.privacy.title')}
                  </h3>

                  {(t('sidebar.privacy.sections', { returnObjects: true }) as any[]).map((section: any, idx: number) => (
                    <section key={idx}>
                      <h4 className="font-bold text-slate-900 dark:text-white mb-2">{section.title}</h4>
                      <p className="leading-relaxed whitespace-pre-line">
                        {section.content}
                      </p>
                    </section>
                  ))}

                  <Separator className="my-6" />

                  <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-line">
                    {t('sidebar.privacy.footer')}
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
