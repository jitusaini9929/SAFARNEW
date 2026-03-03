import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage, AvatarBadge, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authService } from "@/utils/authService";
import { HelpCircle, LogOut, Settings, Sun, Moon, Home, Menu, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useGuidedTour } from "@/contexts/GuidedTourContext";
import safarLogo from "@/assets/safar-logo.png.jpeg";
import { useState } from "react";
import ThemeToggle from "@/components/ui/theme-toggle";
import GlobalSidebar from "./GlobalSidebar";
// import LanguageToggle from "./LanguageToggle"; // Hidden for soft launch
import { useTranslation } from "react-i18next";

interface TopNavbarProps {
  userName?: string;
  userAvatar?: string;
  onLogout?: () => void;
  showMobileMenu?: boolean;
  homeRoute?: string;
}

export default function TopNavbar({ userName = "Student", userAvatar = "", onLogout, showMobileMenu = true, homeRoute = "/home" }: TopNavbarProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { resetTourHistory } = useGuidedTour();
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
    if (onLogout) {
      onLogout();
    }
    navigate("/login");
  };

  const handleProfile = () => {
    navigate("/profile");
    setIsMobileMenuOpen(false);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="h-16 bg-white/80 dark:bg-[#0B0F19]/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 sticky top-0 z-40 shadow-sm">
        <div className="h-full px-6 flex items-center justify-between">
          {/* Left side - Hamburger (mobile) + Logo and Portal Name */}
          <div className="flex items-center gap-3">
            {/* Hamburger Menu Button (visible on all screens if showMobileMenu is true) */}
            {showMobileMenu && (
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <Link to={homeRoute} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              {/* Logo with teal gradient background like Landing page */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#6EE7B7] to-teal-600 flex items-center justify-center text-black font-serif text-xl font-bold shadow-lg shadow-[#6EE7B7]/20 overflow-hidden">
                <img
                  src={safarLogo}
                  alt="Safar Logo"
                  className="w-full h-full object-cover"
                />
              </div>

              <h1 className="text-xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">
                SAFAR
              </h1>
            </Link>
          </div>

          {/* Right side - Theme Toggle and User Avatar */}
          <div className="flex items-center gap-5 pr-6">
            {/* Theme Toggle Button */}
            <ThemeToggle />
            {/* <LanguageToggle /> */}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-center w-[40px] h-[40px] p-0.5 rounded-full transition-all duration-200 hover:scale-105 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/80 outline-none">
                  <Avatar className="h-full w-full border border-slate-200 dark:border-white/10 transition-transform">
                    <AvatarImage
                      src={userAvatar}
                      alt={userName}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs ring-1 ring-inset ring-slate-900/10 dark:ring-white/10">
                      {userName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-xl border-slate-200 dark:border-white/10 rounded-2xl shadow-xl p-2">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{userName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Student</p>
                </div>
                <DropdownMenuSeparator className="bg-slate-200 dark:bg-white/10" />
                <DropdownMenuItem onClick={handleProfile} className="cursor-pointer gap-2 text-slate-700 dark:text-slate-300 hover:text-[#6EE7B7] dark:hover:text-[#6EE7B7]">
                  <Settings className="w-4 h-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-200 dark:bg-white/10" />
                <DropdownMenuItem
                  onClick={() => { resetTourHistory(); window.location.reload(); }}
                  className="cursor-pointer gap-2 text-slate-700 dark:text-slate-300 hover:text-[#6EE7B7] dark:hover:text-[#6EE7B7]"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>{t('nav.restart_tours')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-200 dark:bg-white/10" />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer gap-2 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300">
                  <LogOut className="w-4 h-4" />
                  <span>{t('nav.sign_out')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Global Navigation Sidebar */}
      {showMobileMenu && (
        <GlobalSidebar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          homeRoute={homeRoute}
        />
      )}
    </>
  );
}
