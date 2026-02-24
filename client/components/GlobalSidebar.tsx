import { useNavigate, useLocation } from "react-router-dom";
import { X, Home, Settings, Heart, MessageSquare, Timer, Wind, LayoutDashboard, Bookmark, BarChart3, Shield } from "lucide-react";

interface GlobalSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    homeRoute?: string;
    onOpenMehfilSidebar?: () => void;
}

export default function GlobalSidebar({ isOpen, onClose, homeRoute = "/landing", onOpenMehfilSidebar }: GlobalSidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    
    const isMehfilPath = location.pathname.startsWith('/mehfil');

    const handleNavigation = (path: string) => {
        navigate(path);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
                onClick={onClose}
            />
            <div className="fixed inset-y-0 left-0 w-[280px] max-w-[85vw] bg-white dark:bg-[#0B0F19] lg:bg-background border-r border-slate-200 dark:border-white/10 shadow-2xl z-[110] animate-in slide-in-from-left duration-300 overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/10">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Menu</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors text-slate-500 dark:text-slate-400"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-2">
                    <button
                        onClick={() => handleNavigation(homeRoute)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left text-slate-700 dark:text-slate-300"
                    >
                        <Home className="w-5 h-5" />
                        <span className="font-medium">Home</span>
                    </button>

                    <div className="py-2">
                        <div className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Apps</div>
                        <button
                            onClick={() => handleNavigation("/dashboard")}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left text-slate-700 dark:text-slate-300"
                        >
                            <LayoutDashboard className="w-5 h-5 text-indigo-500" />
                            <span className="font-medium">Dashboard</span>
                        </button>
                        <button
                            onClick={() => handleNavigation("/nishtha/check-in")}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left text-slate-700 dark:text-slate-300"
                        >
                            <Heart className="w-5 h-5 text-emerald-500" />
                            <span className="font-medium">Nishtha</span>
                        </button>
                        <button
                            onClick={() => handleNavigation("/mehfil")}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left text-slate-700 dark:text-slate-300"
                        >
                            <MessageSquare className="w-5 h-5 text-cyan-500" />
                            <span className="font-medium">Mehfil</span>
                        </button>
                        <button
                            onClick={() => handleNavigation("/study")}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left text-slate-700 dark:text-slate-300"
                        >
                            <Timer className="w-5 h-5 text-amber-500" />
                            <span className="font-medium">Ekagra Mode</span>
                        </button>
                        <button
                            onClick={() => handleNavigation("/meditation")}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left text-slate-700 dark:text-slate-300"
                        >
                            <Wind className="w-5 h-5 text-teal-500" />
                            <span className="font-medium">Dhyan</span>
                        </button>
                    </div>

                    {isMehfilPath && onOpenMehfilSidebar && (
                        <div className="py-2">
                            <div className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Mehfil Actions</div>
                            <button
                                onClick={() => {
                                    onClose();
                                    onOpenMehfilSidebar();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-indigo-900/40 transition-colors text-left text-indigo-700 dark:text-indigo-300"
                            >
                                <MessageSquare className="w-5 h-5 text-indigo-500" />
                                <span className="font-medium">Open Mehfil Sidebar</span>
                            </button>
                        </div>
                    )}

                    <div className="py-2">
                        <div className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Account</div>
                        <button
                            onClick={() => handleNavigation("/profile")}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left text-slate-700 dark:text-slate-300"
                        >
                            <Settings className="w-5 h-5" />
                            <span className="font-medium">Profile Settings</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
