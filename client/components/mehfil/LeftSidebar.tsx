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
        <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-28 h-[calc(100vh-8rem)]">
            <div className="flex flex-col gap-1">
                <button
                    onClick={() => navigate('/')}
                    className={`sidebar-link ${isActive('/') ? 'active' : ''}`}
                >
                    <Home className="w-6 h-6" />
                    Home
                </button>

                {/* Topics with Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowTopicsDropdown(!showTopicsDropdown)}
                        className="sidebar-link w-full justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <Compass className="w-6 h-6" />
                            Topics
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showTopicsDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showTopicsDropdown && (
                        <div className="ml-9 mt-1 flex flex-col gap-1">
                            <button
                                onClick={() => {
                                    setSelectedTopic('discussion');
                                    setShowTopicsDropdown(false);
                                }}
                                className={`sidebar-link text-sm ${selectedTopic === 'discussion' ? 'bg-primary/10 text-primary' : ''}`}
                            >
                                Discussion
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedTopic('venting');
                                    setShowTopicsDropdown(false);
                                }}
                                className={`sidebar-link text-sm ${selectedTopic === 'venting' ? 'bg-primary/10 text-primary' : ''}`}
                            >
                                Venting Out
                            </button>
                        </div>
                    )}
                </div>
                <button
                    onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        // Optionally set topic if we had IDs, for now just scroll to composer
                    }}
                    className="sidebar-link"
                >
                    <MessageSquare className="w-6 h-6" />
                    Say Hello
                </button>
                <button className="sidebar-link">
                    <Calendar className="w-6 h-6" />
                    Weekly Events
                </button>
            </div>

        </aside>
    );
};

export default LeftSidebar;
