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
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: BarChart3,
    description: "Overview & summary",
  },
  {
    label: "Emotional Check-In",
    href: "/check-in",
    icon: Heart,
    description: "Daily mood tracking",
  },
  {
    label: "Journal",
    href: "/journal",
    icon: BookOpen,
    description: "Private thoughts",
  },
  {
    label: "Goals",
    href: "/goals",
    icon: Target,
    description: "Daily & weekly goals",
  },
  {
    label: "Streaks",
    href: "/streaks",
    icon: Flame,
    description: "Maintain your streaks",
  },
  {
    label: "Suggestions",
    href: "/suggestions",
    icon: Lightbulb,
    description: "Personalized tips",
  },
  {
    label: "Profile",
    href: "/profile",
    icon: User,
    description: "Account settings",
  },
];

// Mobile bottom nav items (subset for cleaner mobile UX)
const mobileNavItems = [
  { label: "Home", href: "/dashboard", icon: BarChart3 },
  { label: "Check-In", href: "/check-in", icon: Heart },
  { label: "Journal", href: "/journal", icon: BookOpen },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Profile", href: "/profile", icon: User },
];

export default function LeftSidebar() {
  const location = useLocation();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 glass border-r border-border h-screen sticky top-0 overflow-y-auto">
        <div className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col gap-1 px-4 py-3 rounded-lg transition-all duration-200 group",
                  isActive
                    ? "bg-gradient-to-r from-primary/10 to-secondary/10 border-l-4 border-primary"
                    : "hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-colors duration-200",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-primary"
                    )}
                  />
                  <span
                    className={cn(
                      "font-medium transition-colors duration-200",
                      isActive ? "text-primary" : "text-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground ml-8">{item.description}</p>
              </Link>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="px-4 py-6 border-t border-border">
          <div className="bg-gradient-to-br from-secondary/10 to-accent/10 border border-border/50 rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground mb-2">
              💚 Remember: Your well-being matters
            </p>
            <p className="text-xs font-medium text-foreground">
              Take breaks, stay balanced, succeed sustainably.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
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
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
