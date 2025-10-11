"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type SidebarThemeToggleProps = {
  compact?: boolean;
};

/** サイドバー内のライト/ダーク切り替えトグル */
export default function SidebarThemeToggle({ compact = false }: SidebarThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  const label = isDark ? "ダークモード" : "ライトモード";

  return (
    <button
      type="button"
      className={[
        "flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800",
        compact ? "md:justify-center" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <span className={compact ? "md:hidden" : ""}>{label}</span>
      <span
        className={`text-xs text-slate-500 transition-opacity dark:text-slate-400 ${compact ? "hidden md:inline" : ""}`}
        aria-hidden={compact}
      >
        {compact ? (isDark ? "Dark" : "Light") : "切り替え"}
      </span>
    </button>
  );
}
