import { useNavigate, useLocation } from "react-router-dom";
import { X, Home, Settings, Heart, MessageSquare, Timer, Wind, LayoutDashboard, Bookmark, BarChart3, Shield, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SHOW_LIVE_SESSIONS_IN_NAV } from "@/config/featureFlags";

interface GlobalSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    homeRoute?: string;
    onOpenMehfilSidebar?: (view?: 'connections' | 'saved' | 'activity' | 'privacy') => void;
}

export default function GlobalSidebar({ isOpen, onClose, homeRoute = "/home", onOpenMehfilSidebar }: GlobalSidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    const isMehfilPath = location.pathname.startsWith('/mehfil');

    const handleNavigation = (path: string) => {
        navigate(path);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="fixed inset-y-0 left-0 z-[110] w-[300px] max-w-[88vw] overflow-y-auto border-r border-border/70 bg-card/92 shadow-[var(--surface-shadow-strong)] backdrop-blur-2xl animate-in slide-in-from-left duration-300">
                <div className="flex items-center justify-between border-b border-slate-200/80 p-5 dark:border-white/10">
                    <h2 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">{t('nav.menu')}</h2>
                    <button
                        onClick={onClose}
                        className="ui-pressable rounded-full border border-transparent p-2 text-white transition-[transform,background-color,border-color,color] duration-150 hover:border-border/70 hover:bg-white/10 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-2 p-4">
                    <button
                        onClick={() => handleNavigation(homeRoute)}
                        className="ui-pressable w-full rounded-2xl px-4 py-3 text-left text-slate-950 font-semibold transition-[transform,background-color,color] duration-150 hover:bg-slate-100/85 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <div className="flex items-center gap-3">
                            <Home className="w-5 h-5" />
                            <span className="font-medium">Home</span>
                        </div>
                    </button>

                    <div className="py-2">
                        <div className="mb-2 px-4 text-xs font-bold uppercase tracking-wider text-white">{t('nav.apps')}</div>
                        <button
                            onClick={() => handleNavigation("/dashboard")}
                            className="ui-pressable w-full rounded-2xl px-4 py-3 text-left text-slate-950 font-semibold transition-[transform,background-color,color] duration-150 hover:bg-slate-100/85 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            <div className="flex items-center gap-3">
                                <LayoutDashboard className="w-5 h-5 text-indigo-500" />
                                <span className="font-medium">{t('nav.dashboard')}</span>
                            </div>
                        </button>
                        <button
                            onClick={() => handleNavigation("/check-in")}
                            className="ui-pressable w-full rounded-2xl px-4 py-3 text-left text-slate-950 font-semibold transition-[transform,background-color,color] duration-150 hover:bg-slate-100/85 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            <div className="flex items-center gap-3">
                                <Heart className="w-5 h-5 text-emerald-500" />
                                <span className="font-medium">{t('apps.nishtha_name')}</span>
                            </div>
                        </button>
                        <button
                            onClick={() => handleNavigation("/mehfil")}
                            className="ui-pressable w-full rounded-2xl px-4 py-3 text-left text-slate-950 font-semibold transition-[transform,background-color,color] duration-150 hover:bg-slate-100/85 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            <div className="flex items-center gap-3">
                                <MessageSquare className="w-5 h-5 text-cyan-500" />
                                <span className="font-medium">{t('apps.mehfil_name')}</span>
                            </div>
                        </button>
                        <button
                            onClick={() => handleNavigation("/study")}
                            className="ui-pressable w-full rounded-2xl px-4 py-3 text-left text-slate-950 font-semibold transition-[transform,background-color,color] duration-150 hover:bg-slate-100/85 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            <div className="flex items-center gap-3">
                                <Timer className="w-5 h-5 text-amber-500" />
                                <span className="font-medium">{t('apps.ekagra_name')}</span>
                            </div>
                        </button>
                        <button
                            onClick={() => handleNavigation("/meditation")}
                            className="ui-pressable w-full rounded-2xl px-4 py-3 text-left text-slate-950 font-semibold transition-[transform,background-color,color] duration-150 hover:bg-slate-100/85 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            <div className="flex items-center gap-3">
                                <Wind className="w-5 h-5 text-teal-500" />
                                <span className="font-medium">{t('apps.dhyan_name')}</span>
                            </div>
                        </button>
                        {SHOW_LIVE_SESSIONS_IN_NAV && (
                        <button
                            onClick={() => handleNavigation("/live-sessions")}
                            className="ui-pressable w-full rounded-2xl px-4 py-3 text-left text-slate-950 font-semibold transition-[transform,background-color,color] duration-150 hover:bg-slate-100/85 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            <div className="flex items-center gap-3">
                                <Radio className="w-5 h-5 text-indigo-500" />
                                <span className="font-medium">Live Classes</span>
                            </div>
                        </button>
                        )}
                        <button
                            onClick={() => handleNavigation("/courses")}
                            className="ui-pressable w-full rounded-2xl px-4 py-3 text-left text-slate-950 font-semibold transition-[transform,background-color,color] duration-150 hover:bg-slate-100/85 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            <div className="flex items-center gap-3">
                                <Shield className="w-5 h-5 text-emerald-500" />
                                <span className="font-medium">Courses</span>
                            </div>
                        </button>
                    </div>

                    {isMehfilPath && onOpenMehfilSidebar && (
                        <div className="py-2">
                            <div className="mb-2 px-4 text-xs font-bold uppercase tracking-wider text-white">{t('nav.mehfil_actions')}</div>
                            <button
                                onClick={() => {
                                    onClose();
                                    onOpenMehfilSidebar('saved');
                                }}
                                className="ui-pressable w-full rounded-2xl px-4 py-3 text-left text-indigo-950 font-semibold transition-[transform,background-color,color] duration-150 hover:bg-slate-100/85 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
                            >
                                <div className="flex items-center gap-3">
                                    <MessageSquare className="w-5 h-5 text-indigo-500" />
                                    <span className="font-medium">{t('nav.saved_posts')}</span>
                                </div>
                            </button>
                            <button
                                onClick={() => {
                                    onClose();
                                    onOpenMehfilSidebar('activity');
                                }}
                                className="ui-pressable w-full rounded-2xl px-4 py-3 text-left text-slate-950 font-semibold transition-[transform,background-color,color] duration-150 hover:bg-slate-100/85 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                            >
                                <div className="flex items-center gap-3">
                                    <BarChart3 className="w-5 h-5 text-cyan-500" />
                                    <span className="font-medium">{t('nav.activity')}</span>
                                </div>
                            </button>
                        </div>
                    )}

                    <div className="py-2">
                        <div className="mb-2 px-4 text-xs font-bold uppercase tracking-wider text-white">{t('nav.account')}</div>
                        <button
                            onClick={() => handleNavigation("/profile")}
                            className="ui-pressable w-full rounded-2xl px-4 py-3 text-left text-slate-950 font-semibold transition-[transform,background-color,color] duration-150 hover:bg-slate-100/85 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            <div className="flex items-center gap-3">
                                <Settings className="w-5 h-5" />
                                <span className="font-medium">{t('nav.profile_settings')}</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
