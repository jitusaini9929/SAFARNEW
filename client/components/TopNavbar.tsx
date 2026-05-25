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
import { useAuth } from "@/contexts/AuthContext";
import SafarLogo from "@/components/landing/SafarLogo";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ui/theme-toggle";
import GlobalSidebar from "./GlobalSidebar";
import LanguageToggle from "./LanguageToggle";
import { useTranslation } from "react-i18next";
import { canAccessLanguageToggle } from "@/utils/languageToggleAccess";

interface TopNavbarProps {
  userName?: string;
  userAvatar?: string;
  onLogout?: () => void;
  showMobileMenu?: boolean;
  showMenuButton?: boolean;
  homeRoute?: string;
}

export default function TopNavbar({
  userName = "Student",
  userAvatar = "",
  onLogout,
  showMobileMenu = true,
  showMenuButton = true,
  homeRoute = "/home",
}: TopNavbarProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { resetTourHistory } = useGuidedTour();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const canShowLanguageToggle = canAccessLanguageToggle(user?.email);

  useEffect(() => {
    if (!showMobileMenu) return;
    const handler = () => setIsMobileMenuOpen(true);
    window.addEventListener("global-menu:open", handler);
    return () => window.removeEventListener("global-menu:open", handler);
  }, [showMobileMenu]);

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
      <nav className="sticky top-0 z-40 border-b border-border/70 bg-card/94 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          {/* Left side - Hamburger (mobile) + Logo and Portal Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="ui-pressable inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link to={homeRoute} className="ui-pressable flex items-center gap-3 rounded-2xl pr-2 hover:opacity-90">
              <div className="flex h-10 w-10 items-center justify-center overflow-visible">
                <SafarLogo
                  className="h-10 w-10 origin-center scale-[1.3] text-[#042854] dark:text-white"
                  title="Safar Logo"
                />
              </div>

              <h1 className="text-xl font-playfair font-bold text-[#042854] dark:text-white tracking-tight sm:text-[2rem]">
                SAFAR
              </h1>
            </Link>
          </div>

          {/* Right side - Theme Toggle and User Avatar */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Theme Toggle Button */}
            <ThemeToggle />
            {canShowLanguageToggle && <LanguageToggle />}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ui-pressable flex h-[44px] w-[44px] items-center justify-center rounded-full border border-transparent bg-transparent p-0.5 outline-none hover:border-border/70 hover:bg-muted/70">
                  <Avatar className="h-full w-full border border-slate-200/80 dark:border-white/10 shadow-sm transition-transform">
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
              <DropdownMenuContent align="end" sideOffset={10} className="mt-2 w-60 p-2">
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
