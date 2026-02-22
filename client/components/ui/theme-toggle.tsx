import { Moon, Sun, Contrast } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "./button";

interface ThemeToggleProps {
  variant?: "icon" | "icon-with-bg" | "button";
  className?: string;
  size?: "sm" | "default" | "lg";
}

export default function ThemeToggle({
  variant = "icon-with-bg",
  className = "",
  size = "default"
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  if (variant === "button") {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={toggleTheme}
        className={className}
      >
        {theme === "dark" ? (
          <>
            <Sun className="w-4 h-4 mr-2" />
            Light Mode
          </>
        ) : (
          <>
            <Moon className="w-4 h-4 mr-2" />
            Dark Mode
          </>
        )}
      </Button>
    );
  }

  if (variant === "icon") {
    return (
      <button
        onClick={toggleTheme}
        className={`min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${className}`}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {theme === "dark" ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Moon className="w-5 h-5" />
        )}
      </button>
    );
  }

  // icon-with-bg variant (default)
  return (
    <button
      onClick={toggleTheme}
      className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors ${className}`}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
}

// Export contrast icon variant for existing Mehfil compatibility
export function ThemeToggleContrast({ className = "" }: { className?: string }) {
  const { toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors ${className}`}
      title="Toggle theme"
    >
      <Contrast className="w-5 h-5" />
    </button>
  );
}
