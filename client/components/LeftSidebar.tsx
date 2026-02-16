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
  Menu,
  X
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface LeftSidebarProps {
  homeRoute?: string;
}

export default function LeftSidebar({ homeRoute = "/landing" }: LeftSidebarProps) {
  const location = useLocation();

  const navItems = [
    {
      label: "Home",
      href: homeRoute,
      icon: Home,
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
      label: "Analytics",
      href: "/nishtha/analytics",
      icon: BarChart3,
      description: "Monthly scorecard",
    },
    {
      label: "Suggestions",
      href: "/nishtha/suggestions",
      icon: Lightbulb,
      description: "Personalized tips",
    },
  ];

  // Mobile bottom nav items - Key features + Menu
  const mobileNavItems = [
    { label: "Home", href: homeRoute, icon: Home },
    { label: "Check-In", href: "/nishtha/check-in", icon: Heart },
    { label: "Journal", href: "/nishtha/journal", icon: BookOpen },
    { label: "Goals", href: "/nishtha/goals", icon: Target },
  ];

  const NavLink = ({ item, isMobile = false }: { item: any, isMobile?: boolean }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.href;

    return (
      <Link
        to={item.href}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
          isActive
            ? "bg-gradient-to-r from-[#6EE7B7]/20 to-teal-500/10 text-slate-900 dark:text-white font-medium"
            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white",
          isMobile && isActive && "bg-transparent text-[#6EE7B7]"
        )}
      >
        {isActive && !isMobile && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#6EE7B7] rounded-r-full" />
        )}
        <Icon
          className={cn(
            "w-5 h-5 transition-colors duration-200",
            isActive ? "text-[#6EE7B7]" : "group-hover:text-[#6EE7B7]"
          )}
        />
        <span className="flex-1">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside data-tour="sidebar-nav" className="hidden lg:flex flex-col w-64 bg-white/80 dark:bg-[#0B0F19]/95 backdrop-blur-xl border-r border-slate-200 dark:border-white/10 h-full sticky top-0 overflow-y-auto">
        <div className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 safe-area-bottom shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16 px-2">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all duration-300",
                  isActive ? "text-[#6EE7B7] -translate-y-1" : "text-slate-500 dark:text-slate-400"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "fill-current/20")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* Menu Trigger for Full Sidebar */}
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-1 flex-1 py-1 text-slate-500 dark:text-slate-400 hover:text-[#6EE7B7] transition-colors">
                <Menu className="w-5 h-5" />
                <span className="text-[10px] font-medium">Menu</span>
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[80%] sm:w-[350px] p-0 border-r border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-xl">
              <SheetHeader className="p-6 border-b border-border">
                <SheetTitle className="text-left flex items-center gap-2">
                  <span className="text-xl font-bold bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent">Nishtha</span>
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col h-full overflow-y-auto pb-20 pt-4 px-4 space-y-1">
                {navItems.map((item) => (
                  <SheetClose key={item.href} asChild>
                    <NavLink item={item} />
                  </SheetClose>
                ))}

                <div className="mt-8 p-4 bg-muted/30 rounded-xl">
                  <p className="text-xs text-muted-foreground text-center">
                    "Small steps, big changes."
                  </p>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}
