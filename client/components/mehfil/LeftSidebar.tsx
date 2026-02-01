import React, { useState } from 'react';
import { Home, Compass, TrendingUp, Rocket, MessageSquare, Calendar, ChevronDown } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const LeftSidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showTopicsDropdown, setShowTopicsDropdown] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState<'discussion' | 'venting'>('discussion');

    const isActive = (path: string) => location.pathname === path;

    return (
        <aside className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 sticky top-28 h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar pb-6">
            <div className="flex flex-col gap-1.5">
                <button
                    onClick={() => navigate('/landing')}
                    className={`sidebar-link group ${isActive('/') ? 'active bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'}`}
                >
                    <Home className={`w-5 h-5 ${isActive('/') ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                    <span className="font-semibold tracking-wide">Home</span>
                </button>

                {/* Topics with Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowTopicsDropdown(!showTopicsDropdown)}
                        className={`sidebar-link w-full justify-between group ${showTopicsDropdown ? 'bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'}`}
                    >
                        <div className="flex items-center gap-3">
                            <Compass className="w-5 h-5" />
                            <span className="font-semibold tracking-wide">Topics</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showTopicsDropdown ? 'rotate-180 text-teal-500' : 'text-slate-400'}`} />
                    </button>
                    {showTopicsDropdown && (
                        <div className="ml-4 mt-2 pl-4 border-l-2 border-slate-100 dark:border-slate-800 flex flex-col gap-1 animate-in slide-in-from-top-2 duration-200">
                            <button
                                onClick={() => {
                                    setSelectedTopic('discussion');
                                    setShowTopicsDropdown(false);
                                }}
                                className={`sidebar-link text-sm py-2 ${selectedTopic === 'discussion' ? 'text-teal-600 dark:text-teal-400 font-bold bg-transparent' : 'text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                            >
                                Discussion
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedTopic('venting');
                                    setShowTopicsDropdown(false);
                                }}
                                className={`sidebar-link text-sm py-2 ${selectedTopic === 'venting' ? 'text-teal-600 dark:text-teal-400 font-bold bg-transparent' : 'text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                            >
                                Venting Out
                            </button>
                        </div>
                    )}
                </div>
                <button className="sidebar-link text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100">
                    <Calendar className="w-5 h-5" />
                    <span className="font-semibold tracking-wide">Weekly Events</span>
                </button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                <h3 className="px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">My Communities</h3>
                <div className="flex flex-col gap-1">
                    {['Engineering', 'Design Club', 'Late Night Study'].map((item, i) => (
                        <button key={i} className="sidebar-link text-sm py-2 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-transparent">
                            <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-teal-400' : i === 1 ? 'bg-indigo-400' : 'bg-rose-400'}`}></div>
                            {item}
                        </button>
                    ))}
                </div>
            </div>
        </aside>
    );
};

export default LeftSidebar;
