import { Moon, Sun } from "lucide-react";
import type { ClientTheme } from "./client-themes";

interface ThemeToggleProps {
  theme: ClientTheme;
  onToggle: () => void;
  style?: React.CSSProperties;
}

export function ThemeToggle({ theme, onToggle, style }: ThemeToggleProps) {
  const blackskyMode = theme === "blacksky";
  return (
    <button
      onClick={onToggle}
      className="border-border absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs backdrop-blur-md transition-colors"
      style={{
        backgroundColor: "var(--back-face-pill-bg)",
        color: "var(--back-face-pill-fg)",
        ...style,
      }}
      aria-label={
        blackskyMode ? "Switch to default theme" : "Switch to Blacksky theme"
      }
    >
      {blackskyMode ? (
        <Sun className="h-3 w-3" />
      ) : (
        <Moon className="h-3 w-3" />
      )}
      {blackskyMode ? "Bluesky mode" : "Blacksky mode"}
    </button>
  );
}
