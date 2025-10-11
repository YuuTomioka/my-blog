"use client";

import { PropsWithChildren } from "react";
import { useSidebar } from "./SidebarProvider";
import SidebarContent from "./SidebarContent";

/** サイドバー本体コンポーネント */
export default function Sidebar() {
  const { mobileOpen, setMobileOpen, desktopCollapsed } = useSidebar();

  // 幅（PC）
  const desktopWidth = desktopCollapsed ? "md:w-20" : "md:w-64";

  return (
    <>
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r border-slate-200 bg-white/95 p-3 text-slate-700 shadow-sm backdrop-blur transition-[transform,width] duration-200 dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-200",
          // SP: ドロワー
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // PC: 常時表示 + 幅切替
          "md:translate-x-0",
          desktopWidth,
        ].join(" ")}
        aria-label="Sidebar"
      >
        <SidebarContent collapsed={desktopCollapsed} />
      </aside>

      {/* モバイル時のオーバーレイ */}
      {mobileOpen && (
        <button
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Close sidebar overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}

/** サイドバーに合わせてメインコンテンツのパディングを調整するコンポーネント */
export function SidebarMain({ children, className }: PropsWithChildren<{ className?: string }>) {
  const { desktopCollapsed } = useSidebar();
  const pad = desktopCollapsed ? "md:pl-20" : "md:pl-64";
  const cls = ["min-h-screen transition-[padding] duration-200", pad, className]
    .filter(Boolean)
    .join(" ");
  return <main className={cls}>{children}</main>;
}
