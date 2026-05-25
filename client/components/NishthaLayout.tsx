import { ReactNode, useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    Heart, BookOpen, Target, Flame, BarChart3, Lightbulb, Menu
} from "lucide-react";
import { motion } from "framer-motion";
import WelcomeDialog from "./WelcomeDialog";
import GlobalPageFooter from "./GlobalPageFooter";
import GlobalSidebar from "./GlobalSidebar";
import ThemeToggle from "@/components/ui/theme-toggle";
import LanguageToggle from "./LanguageToggle";
import SafarLogo from "@/components/landing/SafarLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useGuidedTour } from "@/contexts/GuidedTourContext";
import { runGoalRolloverPromptFlow } from "@/utils/goalRolloverPrompt";
import { canAccessLanguageToggle } from "@/utils/languageToggleAccess";
import { authService } from "@/utils/authService";
import { cn } from "@/lib/utils";
import {
    MdElevationReact,
    MdDividerReact,
    MdMenuReact,
    MdMenuItemReact,
} from "./mehfil/material/MdComponents";

interface NishthaLayoutProps {
    children: ReactNode;
    userName?: string;
    userAvatar?: string;
    onLogout?: () => void;
}

export default function NishthaLayout({
    children,
    userName: propUserName = "Student",
    userAvatar: propUserAvatar = "",
    onLogout,
}: NishthaLayoutProps) {
    const { user } = useAuth();
    const { theme } = useTheme();
    const { resetTourHistory } = useGuidedTour();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    const [showWelcome, setShowWelcome] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const anchorRef = useRef<HTMLButtonElement>(null);

    const userName = user?.name || propUserName;
    const userAvatar = user?.avatar || propUserAvatar;
    const canShowLanguageToggle = canAccessLanguageToggle(user?.email);

    const tabs = [
        { label: t("nav.checkin") || "Check-In", href: "/check-in", icon: Heart },
        { label: t("nav.journal") || "Journal", href: "/journal", icon: BookOpen },
        { label: t("nav.goals") || "Goals", href: "/goals", icon: Target },
        { label: t("nav.streaks") || "Streaks", href: "/streaks", icon: Flame },
        { label: t("nav.analytics") || "Analytics", href: "/analytics", icon: BarChart3 },
        { label: t("nav.suggestions") || "Suggestions", href: "/suggestions", icon: Lightbulb },
    ];

    useEffect(() => {
        const shouldShow = sessionStorage.getItem("showWelcomeNishtha");
        if (shouldShow === "true") setShowWelcome(true);
    }, []);

    useEffect(() => {
        const handler = () => setIsMobileMenuOpen(true);
        window.addEventListener("global-menu:open", handler);
        return () => window.removeEventListener("global-menu:open", handler);
    }, []);

    useEffect(() => {
        const checkMissedGoals = async () => {
            if (!user?.id) return;
            try {
                await runGoalRolloverPromptFlow(user.id);
            } catch (error) {
                console.error("Failed to run rollover prompt flow:", error);
            }
        };
        checkMissedGoals();
    }, [user?.id]);

    // Manual sliding offset measurement removed - handled perfectly by Framer Motion layoutId

    const handleCloseWelcome = () => {
        setShowWelcome(false);
        sessionStorage.removeItem("showWelcomeNishtha");
    };

    const handleLogout = async () => {
        try { await authService.logout(); } catch {}
        navigate("/login");
    };

    const handleMenuClick = (action: string) => {
        setMenuOpen(false);
        if (action === "profile") navigate("/profile");
        else if (action === "tours") { resetTourHistory(); window.location.reload(); }
        else if (action === "logout") handleLogout();
    };

    return (
        <div className="flex flex-col h-[100dvh] overflow-hidden bg-[#f8f7f9] dark:bg-background transition-colors duration-300 relative">
            {showWelcome && <WelcomeDialog onClose={handleCloseWelcome} userName={userName} />}

            {/* ── Unified M3 Top Navbar ── */}
            <nav className="sticky top-0 z-40 w-full border-b border-border/70 bg-card/94 shadow-sm backdrop-blur-md transition-colors duration-300">
                <MdElevationReact
                    className="pointer-events-none absolute inset-0 z-[-1]"
                    style={{ "--md-elevation-level": "1" } as React.CSSProperties}
                />

                <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6 md:px-8">

                    {/* Left: Hamburger (mobile) + Brand */}
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="ui-pressable inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Open Menu"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        <Link
                            to="/home"
                            className="ui-pressable flex items-center gap-3 rounded-2xl pr-2 hover:opacity-90 transition-all decoration-transparent no-underline"
                        >
                            <div className="flex h-10 w-10 items-center justify-center overflow-visible">
                                <SafarLogo
                                    className="h-10 w-10 origin-center scale-[1.3] text-[#042854] dark:text-white"
                                    title="Safar Logo"
                                />
                            </div>
                            <h1 className="text-xl font-playfair font-bold text-[#042854] dark:text-white tracking-tight sm:text-[2rem] mt-0.5 select-none no-underline">
                                SAFAR
                            </h1>
                        </Link>
                    </div>

                    {/* Center: Navigation Tabs */}
                    <nav
                        className="hidden lg:flex items-center gap-0.5 flex-1 justify-center mx-6 relative"
                        aria-label="Nishtha navigation"
                    >
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = location.pathname === tab.href;
                            return (
                                <Link
                                    key={tab.href}
                                    to={tab.href}
                                    data-active={isActive}
                                    className={cn(
                                        "relative z-10 flex items-center gap-1.5 px-4 py-2 rounded-full text-[13.5px] font-medium transition-colors duration-300 no-underline select-none",
                                        isActive
                                            ? "text-gray-900 dark:text-white font-semibold"
                                            : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                                    )}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="desktop-active-indicator"
                                            className="absolute inset-0 bg-slate-200/70 dark:bg-slate-800/80 rounded-full z-[-1]"
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    )}
                                    <Icon
                                        className={cn(
                                            "w-[17px] h-[17px] shrink-0 transition-colors duration-300 relative z-10",
                                            isActive
                                                ? "text-gray-800 dark:text-white"
                                                : "text-gray-400 dark:text-slate-500"
                                        )}
                                    />
                                    <span className="relative z-10">{tab.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right: Utility controls */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <ThemeToggle />
                        {canShowLanguageToggle && <LanguageToggle />}

                        {/* Avatar + Dropdown */}
                        <div className="relative flex items-center">
                            <button
                                ref={anchorRef}
                                onClick={() => setMenuOpen(!menuOpen)}
                                id="nishtha-avatar-menu-trigger"
                                className="ui-pressable flex h-[44px] w-[44px] items-center justify-center rounded-full border border-transparent bg-transparent p-0.5 outline-none hover:border-border/70 hover:bg-muted/70 transition-colors"
                                aria-label="User menu"
                            >
                                {userAvatar ? (
                                    <img
                                        src={userAvatar}
                                        alt={userName}
                                        className="h-full w-full rounded-full object-cover border border-slate-200/80 dark:border-white/10 shadow-sm"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm ring-1 ring-inset ring-slate-900/10 dark:ring-white/10">
                                        {userName.slice(0, 2).toUpperCase()}
                                    </div>
                                )}
                            </button>

                            <MdMenuReact
                                anchor="nishtha-avatar-menu-trigger"
                                open={menuOpen}
                                onClosed={() => setMenuOpen(false)}
                                anchorCorner={"BOTTOM_END" as any}
                                style={{
                                    "--md-menu-container-shape": "16px",
                                    position: "absolute",
                                    right: 0,
                                    top: "100%",
                                    marginTop: "8px",
                                } as React.CSSProperties}
                            >
                                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 min-w-[192px]">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{userName}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Student</p>
                                </div>
                                <MdMenuItemReact onClick={() => handleMenuClick("profile")} className="cursor-pointer">
                                    <div slot="headline">Profile Settings</div>
                                </MdMenuItemReact>
                                <MdMenuItemReact onClick={() => handleMenuClick("tours")} className="cursor-pointer">
                                    <div slot="headline">{t("nav.restart_tours") || "Restart Tours"}</div>
                                </MdMenuItemReact>
                                <MdDividerReact />
                                <MdMenuItemReact onClick={() => handleMenuClick("logout")} className="cursor-pointer text-rose-600 dark:text-rose-400">
                                    <div slot="headline">{t("nav.sign_out") || "Sign Out"}</div>
                                </MdMenuItemReact>
                            </MdMenuReact>
                        </div>
                    </div>
                </div>

                {/* Mobile-only tab strip */}
                <div className="lg:hidden overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-t border-gray-100 dark:border-border/60 bg-white dark:bg-card">
                    <div className="flex items-center gap-0.5 px-3 py-1.5 min-w-max relative">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = location.pathname === tab.href;
                            return (
                                <Link
                                    key={tab.href}
                                    to={tab.href}
                                    data-active={isActive}
                                    className={cn(
                                        "relative z-10 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-medium transition-colors duration-300 no-underline select-none whitespace-nowrap",
                                        isActive
                                            ? "text-gray-900 dark:text-white font-semibold"
                                            : "text-gray-500 dark:text-slate-400"
                                    )}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="mobile-active-indicator"
                                            className="absolute inset-0 bg-slate-200/70 dark:bg-slate-800/85 rounded-full z-[-1]"
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    )}
                                    <Icon
                                        className={cn(
                                            "w-3.5 h-3.5 shrink-0 transition-colors duration-300 relative z-10",
                                            isActive ? "text-gray-800 dark:text-white" : "text-gray-400"
                                        )}
                                    />
                                    <span className="relative z-10">{tab.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </nav>

            {/* Page content */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden text-foreground flex flex-col">
                <div className="flex-1 flex flex-col min-h-full pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
                    <div className="flex-1 flex flex-col relative z-0">
                        {children}
                    </div>
                    <GlobalPageFooter />
                </div>
            </main>

            {/* Global Navigation Sidebar (mobile) */}
            <GlobalSidebar
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                homeRoute="/home"
            />
        </div>
    );
}
