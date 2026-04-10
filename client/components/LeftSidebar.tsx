import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { BarChart3, BookOpen, Flame, Heart, Home, Lightbulb, Menu, Target } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface LeftSidebarProps {
  homeRoute?: string;
  showHome?: boolean;
}

export default function LeftSidebar({ homeRoute = "/home", showHome = true }: LeftSidebarProps) {
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = [
    ...(showHome ? [{ label: t("nav.home"), href: homeRoute, icon: Home }] : []),
    {
      label: t("nav.checkin"),
      href: "/nishtha/check-in",
      icon: Heart,
      description: "Daily mood tracking",
    },
    {
      label: t("nav.journal"),
      href: "/nishtha/journal",
      icon: BookOpen,
      description: "Private thoughts",
    },
    {
      label: t("nav.goals"),
      href: "/nishtha/goals",
      icon: Target,
      description: "Daily & weekly goals",
    },
    {
      label: t("nav.streaks"),
      href: "/nishtha/streaks",
      icon: Flame,
      description: "Maintain your streaks",
    },
    {
      label: t("nav.analytics"),
      href: "/nishtha/analytics",
      icon: BarChart3,
      description: "Monthly scorecard",
    },
    {
      label: t("nav.suggestions"),
      href: "/nishtha/suggestions",
      icon: Lightbulb,
      description: "Personalized tips",
    },
  ];

  const mobileNavItems = [
    ...(showHome ? [{ label: t("nav.home"), href: homeRoute, icon: Home }] : []),
    { label: t("nav.checkin"), href: "/nishtha/check-in", icon: Heart },
    { label: t("nav.journal"), href: "/nishtha/journal", icon: BookOpen },
    { label: t("nav.goals"), href: "/nishtha/goals", icon: Target },
    { label: t("nav.streaks"), href: "/nishtha/streaks", icon: Flame },
  ];

  const NavLink = ({
    item,
    isMobile = false,
  }: {
    item: (typeof navItems)[number];
    isMobile?: boolean;
  }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.href;

    return (
      <Link
        to={item.href}
        className={cn(
          "ui-pressable group relative flex items-center gap-3 rounded-2xl px-4 py-3",
          isActive
            ? "bg-gradient-to-r from-[#6EE7B7]/18 via-emerald-400/12 to-transparent text-black dark:text-white font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            : "text-black dark:text-slate-300 hover:bg-slate-100/85 dark:hover:bg-white/6 hover:text-black dark:hover:text-white",
          isMobile && isActive && "bg-transparent text-[#6EE7B7]",
        )}
      >
        {isActive && !isMobile && (
          <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#6EE7B7]" />
        )}
        <Icon
          className={cn(
            "h-5 w-5 transition-colors duration-150",
            isActive ? "text-[#6EE7B7]" : "group-hover:text-[#6EE7B7]",
          )}
        />
        <div className="min-w-0 flex-1">
          <span className="block truncate text-[1.06rem]">{item.label}</span>
          {!isMobile && "description" in item && item.description && (
            <span className="mt-0.5 block truncate text-[12px] font-medium text-black/60 dark:text-slate-400">
              {item.description}
            </span>
          )}
        </div>
      </Link>
    );
  };

  const MenuButton = () => (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("global-menu:open"))}
      className="ui-pressable group relative flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-black dark:text-slate-300 hover:bg-slate-100/85 dark:hover:bg-white/6 hover:text-black dark:hover:text-white"
    >
      <Menu className="h-5 w-5 transition-colors duration-150 group-hover:text-[#6EE7B7]" />
      <span className="flex-1 text-[1.06rem] font-medium">{t("nav.menu") || "Menu"}</span>
    </button>
  );

  const menuTrigger = (
    <Sheet>
      <SheetTrigger asChild>
        <button
          aria-label="Menu"
          className="ui-pressable flex flex-1 flex-col items-center justify-center py-1 text-slate-700 dark:text-slate-200 hover:text-[#6EE7B7]"
        >
          <Menu className="h-6 w-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[84%] sm:w-[360px] border-r border-border/70 bg-card/92 p-0 backdrop-blur-2xl">
        <SheetHeader className="border-b border-border/70 p-6">
          <div className="text-left">
            <SheetTitle className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              Nishtha
            </SheetTitle>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              Consistency and reflection
            </p>
          </div>
        </SheetHeader>
        <div className="flex h-full flex-col space-y-1 overflow-y-auto px-4 pb-20 pt-4">
          {!showHome && (
            <SheetClose asChild>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("global-menu:open"))}
                className="ui-pressable group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100/85 dark:hover:bg-white/6 hover:text-slate-950 dark:hover:text-white"
              >
                <Menu className="h-5 w-5 transition-colors group-hover:text-[#6EE7B7]" />
                <span className="flex-1 text-[1.06rem] font-medium">{t("nav.menu") || "Menu"}</span>
              </button>
            </SheetClose>
          )}
          {navItems.map((item) => (
            <SheetClose key={item.href} asChild>
              <NavLink item={item} />
            </SheetClose>
          ))}

          <div className="mt-8 rounded-2xl border border-border/60 bg-muted/30 p-4">
            <p className="text-center text-xs text-slate-600 dark:text-slate-400">
              Remember: Your well-being matters
            </p>
            <p className="mt-2 text-center text-xs font-medium text-slate-800 dark:text-slate-200">
              Take breaks, stay balanced, succeed sustainably.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <>
      <aside
        data-tour="sidebar-nav"
        className="sticky top-0 hidden h-full w-72 flex-col overflow-y-auto border-r border-border/70 bg-card/72 backdrop-blur-2xl lg:flex"
      >
        <div className="border-b border-border/70 px-5 py-5">
          <h2 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">Nishtha</h2>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Consistency and reflection</p>
        </div>
        <div className="flex-1 space-y-2 px-4 py-5">
          {!showHome && <MenuButton />}
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>
        <div className="border-t border-slate-200 px-4 py-6 dark:border-white/10">
          <div className="rounded-3xl border border-[#6EE7B7]/18 bg-gradient-to-br from-[#6EE7B7]/10 via-emerald-400/8 to-transparent p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <p className="text-xs text-slate-600 dark:text-slate-400">Remember: Your well-being matters</p>
            <p className="mt-2 text-xs font-medium text-slate-800 dark:text-slate-200">
              Take breaks, stay balanced, succeed sustainably.
            </p>
          </div>
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/70 bg-card/88 shadow-[0_-10px_32px_rgba(15,23,42,0.12)] backdrop-blur-2xl safe-area-bottom lg:hidden">
        <div className="flex h-16 items-center justify-around px-2">
          {!showHome && menuTrigger}
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "ui-pressable flex flex-1 items-center justify-center py-1",
                  isActive ? "text-[#6EE7B7]" : "text-slate-700 dark:text-slate-200",
                )}
              >
                <div
                  className={cn(
                    "ease-emphasized flex min-w-[56px] items-center justify-center rounded-2xl px-3 py-2 transition-[background-color,transform] duration-200",
                    isActive && "bg-[#6EE7B7]/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]",
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive && "fill-current/15")} />
                </div>
              </Link>
            );
          })}
          {showHome && menuTrigger}
        </div>
      </nav>
    </>
  );
}
