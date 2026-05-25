import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useGuidedTour } from "@/contexts/GuidedTourContext";
import { useTranslation } from "react-i18next";
import SafarLogo from "@/components/landing/SafarLogo";
import ThemeToggle from "@/components/ui/theme-toggle";
import LanguageToggle from "./LanguageToggle";
import GlobalSidebar from "./GlobalSidebar";
import { authService } from "@/utils/authService";
import { canAccessLanguageToggle } from "@/utils/languageToggleAccess";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  MdElevationReact,
  MdDividerReact,
  MdMenuReact,
  MdMenuItemReact,
  MdIconButtonReact,
} from "./mehfil/material/MdComponents";

interface M3TopNavbarProps {
  moduleName?: "PORTAL" | "MEDITATION" | "MEHFIL" | "PROFILE";
  onSidebarToggle?: () => void;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  showSearch?: boolean;
  extraActions?: React.ReactNode;
  homeRoute?: string;
}

export default function M3TopNavbar({
  moduleName = "PORTAL",
  onSidebarToggle,
  searchTerm = "",
  onSearchChange,
  showSearch = false,
  extraActions,
  homeRoute = "/home",
}: M3TopNavbarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { resetTourHistory } = useGuidedTour();
  const { t } = useTranslation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  const userName = user?.name || "Student";
  const userAvatar = user?.avatar || "";
  const canShowLanguageToggle = canAccessLanguageToggle(user?.email);

  const isMehfil = moduleName === "MEHFIL";
  const displayTitle = isMehfil ? "SAFAR" : moduleName === "PROFILE" ? "Safar" : "SAFAR";
  /** Landing page brand: navy mark in light mode, white in dark */
  const brandMarkClass = "text-[#042854] dark:text-white";
  const logoColorClass = brandMarkClass;
  const brandTitleClass = brandMarkClass;

  useEffect(() => {
    const handler = () => setIsMobileMenuOpen(true);
    window.addEventListener("global-menu:open", handler);
    return () => window.removeEventListener("global-menu:open", handler);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
    navigate("/login");
  };

  const handleMenuClick = (action: string) => {
    setMenuOpen(false);
    if (action === "profile") {
      navigate("/profile");
    } else if (action === "tours") {
      resetTourHistory();
      window.location.reload();
    } else if (action === "logout") {
      handleLogout();
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-40 w-full border-b border-border/70 bg-card/94 shadow-sm backdrop-blur-md transition-colors duration-300">
        <MdElevationReact className="pointer-events-none absolute inset-0 z-[-1]" style={{"--md-elevation-level": "1"} as React.CSSProperties} />

        <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6 md:px-8">
          {/* Left: Menu Trigger + Brand Logo */}
          <div className="flex items-center gap-3">
            {onSidebarToggle && (
              <button
                onClick={onSidebarToggle}
                className="ui-pressable inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Toggle Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <Link to={homeRoute} className="ui-pressable flex items-center gap-3 rounded-2xl pr-2 hover:opacity-90 transition-all decoration-transparent no-underline">
              <div className="flex h-10 w-10 items-center justify-center overflow-visible">
                <SafarLogo className={`h-10 w-10 origin-center scale-[1.3] ${logoColorClass}`} title="Safar Logo" />
              </div>
              <h1 className={`text-xl font-playfair font-bold tracking-tight sm:text-[2rem] mt-0.5 select-none no-underline ${brandTitleClass}`}>
                {displayTitle}
              </h1>
            </Link>
          </div>

          {/* Center: Search Field */}
          {showSearch && onSearchChange && (
            <div className="hidden md:flex flex-1 max-w-xl mx-4 justify-center relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t("mehfil.search") || "Search..."}
                className={
                  isMehfil
                    ? "w-full pl-11 pr-4 py-2.5 rounded-full text-sm focus:outline-none transition-all bg-[var(--mehfil-surface-low)] border border-[var(--mehfil-outline-variant)] text-[var(--mehfil-on-surface)] placeholder:text-[var(--mehfil-on-surface-variant)] focus:border-[var(--mehfil-ui-primary-container)] focus:bg-[var(--mehfil-surface)] focus:ring-1 focus:ring-[var(--mehfil-ui-focus-ring)]"
                    : "w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800 dark:text-slate-200"
                }
              />
              <span className={cn("absolute left-4 top-1/2 -translate-y-1/2", isMehfil ? "text-[var(--mehfil-on-surface-variant)]" : "text-slate-400")}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
            </div>
          )}

          {/* Right: Actions + Settings Dropdown */}
          <div className="flex items-center gap-2 sm:gap-3">
            {extraActions}

            <ThemeToggle />
            {canShowLanguageToggle && <LanguageToggle />}

            <div className="relative flex items-center">
              <button
                ref={anchorRef}
                onClick={() => setMenuOpen(!menuOpen)}
                id="m3-avatar-menu-trigger"
                className="ui-pressable flex h-[44px] w-[44px] items-center justify-center rounded-full border border-transparent bg-transparent p-0.5 outline-none hover:border-border/70 hover:bg-muted/70 transition-colors"
                aria-label="User menu"
              >
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="h-full w-full rounded-full object-cover border border-slate-200/80 dark:border-white/10 shadow-sm" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm ring-1 ring-inset ring-slate-900/10 dark:ring-white/10">
                    {userName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </button>

              <MdMenuReact
                anchor="m3-avatar-menu-trigger"
                open={menuOpen}
                onClosed={() => setMenuOpen(false)}
                anchorCorner={"BOTTOM_END" as any}
                style={{
                  "--md-menu-container-shape": "16px",
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  marginTop: "8px"
                } as React.CSSProperties}
              >
                <div className="px-4 py-2 border-b border-slate-150 dark:border-slate-800 min-w-48">
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
      </nav>

      {/* Global Navigation Sidebar */}
      <GlobalSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        homeRoute={homeRoute}
      />
    </>
  );
}
