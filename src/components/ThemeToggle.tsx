import { useEffect, useState } from "react";

type Theme = "dark" | "light";

function applyTheme(t: Theme) {
  document.documentElement.classList.toggle("theme-light", t === "light");
  document.documentElement.classList.toggle("theme-dark", t === "dark");
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("randomtalk-theme");
    return stored === "light" ? "light" : "dark";
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("randomtalk-theme", theme);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[rgb(var(--rt-card-border))] bg-[rgb(var(--rt-card-bg))] px-3 text-sm text-[rgb(var(--rt-muted))] transition hover:bg-[rgb(var(--rt-card-bg-hover))] focus:outline-none focus:ring-4 focus:ring-[rgb(var(--rt-ring))]"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <span className="text-base">{theme === "dark" ? "🌙" : "☀️"}</span>
      <span className="hidden sm:inline">{theme === "dark" ? "Dark" : "Light"}</span>
    </button>
  );
}

