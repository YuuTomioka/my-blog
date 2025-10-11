"use client";

import { useSidebar } from "./SidebarProvider";

/** モバイル用のサイドバー開閉ボタン */
export default function SidebarToggleMobile() {
  const { mobileOpen, toggleMobile } = useSidebar();

  return (
    <button
      aria-label={mobileOpen ? "Close menu" : "Open menu"}
      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 md:hidden"
      onClick={toggleMobile}
    >
      {mobileOpen ? "Close" : "Menu"}
    </button>
  );
}
