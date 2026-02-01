import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Heart,
  BookOpen,
  Target,
  Flame,
  Lightbulb,
  User,
  Timer,
  Award,
  Home,
} from "lucide-react";

const navItems = [
  {
    label: "Home",
    href: "/landing",
    icon: Home,
    description: "Back to landing",
  },
  {
    label: "Emotional Check-In",
    href: "/nishtha/check-in",
    icon: Heart,
    description: "Daily mood tracking",
  },
  {
    label: "Journal",
    href: "/nishtha/journal",
    icon: BookOpen,
    description: "Private thoughts",
  },
  {
    label: "Goals",
    href: "/nishtha/goals",
    icon: Target,
    description: "Daily & weekly goals",
  },
  {
    label: "Streaks",
    href: "/nishtha/streaks",
    icon: Flame,
    description: "Maintain your streaks",
  },
  {
    label: "Suggestions",
    href: "/nishtha/suggestions",
    icon: Lightbulb,
    description: "Personalized tips",
  },
];

// Mobile bottom nav items - all sections for full navigation
const mobileNavItems = [
  { label: "Check-In", href: "/nishtha/check-in", icon: Heart },
  { label: "Journal", href: "/nishtha/journal", icon: BookOpen },
  { label: "Goals", href: "/nishtha/goals", icon: Target },
  { label: "Streaks", href: "/nishtha/streaks", icon: Flame },
  { label: "Tips", href: "/nishtha/suggestions", icon: Lightbulb },
];

export default function LeftSidebar() {
  const location = useLocation();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white/80 dark:bg-[#0B0F19]/95 backdrop-blur-xl border-r border-slate-200 dark:border-white/10 h-screen sticky top-0 overflow-y-auto">
        <div className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col gap-1 px-4 py-3 rounded-xl transition-all duration-200 group",
                  isActive
                    ? "bg-gradient-to-r from-[#6EE7B7]/20 to-teal-500/10 border-l-4 border-[#6EE7B7] shadow-sm"
                    : "hover:bg-slate-100 dark:hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-colors duration-200",
                      isActive
                        ? "text-[#6EE7B7]"
                        : "text-slate-500 dark:text-slate-400 group-hover:text-[#6EE7B7]"
                    )}
                  />
                  <span
                    className={cn(
                      "font-medium transition-colors duration-200",
                      isActive ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"
                    )}
                  >
                    {item.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-500 ml-8">{item.description}</p>
              </Link>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="px-4 py-6 border-t border-slate-200 dark:border-white/10">
          <div className="bg-gradient-to-br from-[#6EE7B7]/10 to-teal-500/10 border border-[#6EE7B7]/20 rounded-2xl p-4 text-center">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
              💚 Remember: Your well-being matters
            </p>
            <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
              Take breaks, stay balanced, succeed sustainably.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 safe-area-bottom">
        <div className="flex justify-around items-center h-16 px-2">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors",
                  isActive ? "text-[#6EE7B7]" : "text-slate-500 dark:text-slate-400"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "text-[#6EE7B7]")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
