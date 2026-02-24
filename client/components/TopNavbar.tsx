import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface TopNavbarProps {
  userName?: string;
  userAvatar?: string;
  onLogout?: () => void;
  showMobileMenu?: boolean;
  homeRoute?: string;
}

export default function TopNavbar({ userName = "Student", userAvatar = "", onLogout, showMobileMenu = true, homeRoute = "/landing" }: TopNavbarProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { resetTourHistory } = useGuidedTour();
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
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <ThemeToggle />


            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-xl h-[52px] w-[52px] p-0 hover:bg-slate-100 dark:hover:bg-white/10">
                  <Avatar className="h-[52px] w-[52px] rounded-xl border border-[#6EE7B7]/30">
                    <AvatarImage src={userAvatar} alt={userName} className="rounded-xl" />
                    <AvatarFallback className="rounded-xl bg-gradient-to-br from-[#6EE7B7] to-teal-600 text-black font-bold">
                      {userName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-[#0B0F19] border-slate-200 dark:border-white/10 rounded-xl shadow-xl">
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
                  <span>Restart Tours</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-200 dark:bg-white/10" />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer gap-2 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300">
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
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
