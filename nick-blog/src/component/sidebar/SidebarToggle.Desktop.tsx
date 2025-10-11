"use client";

import { useSidebar } from "./SidebarProvider";

/** PC用のサイドバー最小化ボタン */
export default function SidebarToggleDesktop() {
  const { desktopCollapsed, toggleDesktop } = useSidebar();

  return (
    <button
      aria-label={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="hidden items-center rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 md:inline-flex"
      onClick={toggleDesktop}
    >
      {desktopCollapsed ? "Expand" : "Collapse"}
    </button>
  );
}
