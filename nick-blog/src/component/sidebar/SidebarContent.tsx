"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "./SidebarProvider";
import SidebarThemeToggle from "./SidebarThemeToggle";

type NavItem = {
    label: string;
    href: string;
}

const NAV_SAMPLE: NavItem[] = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
];

type SidebarContentProps = {
  collapsed?: boolean;
};

/** サイドバーのコンテンツ部分 */
export default function SidebarContent({ collapsed }: SidebarContentProps = {}) {
  const pathname = usePathname();
  const { setMobileOpen, desktopCollapsed } = useSidebar();
  const isCollapsed = collapsed ?? desktopCollapsed;

  return (
    <div className="flex h-full flex-col">
      {/* ヘッダー（ロゴなど） */}
      <div className="mb-4 flex items-center gap-2 px-2">
        <div className="h-8 w-8 rounded-xl bg-slate-900 dark:bg-slate-100" />
        <div
          className={[
            "text-lg font-semibold text-slate-800 transition-[opacity,transform] dark:text-slate-100",
            isCollapsed ? "pointer-events-none -translate-x-2 opacity-0" : "opacity-100",
          ].join(" ")}
          aria-hidden={isCollapsed}
        >
          My Sidebar
        </div>
      </div>

      {/* ナビゲーション */}
      <nav className="space-y-1">
        {NAV_SAMPLE.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
          const short = item.label.slice(0, 1).toUpperCase();
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={[
                "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                isCollapsed ? "md:justify-center" : "",
              ].join(" ")}
              onClick={() => setMobileOpen(false)}
            >
              <span
                className={[
                  "hidden h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-200 text-sm font-semibold text-slate-700 transition-colors dark:bg-slate-800 dark:text-slate-200",
                  isCollapsed ? "md:flex" : "",
                ].join(" ")}
                aria-hidden={!isCollapsed}
              >
                {short}
              </span>
              <span
                className={[
                  "truncate transition-[opacity,transform,width] duration-150",
                  isCollapsed ? "md:w-0 md:-translate-x-1 md:opacity-0" : "md:w-auto md:opacity-100",
                ].join(" ")}
                aria-hidden={isCollapsed}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 px-2 pt-4">
        <SidebarThemeToggle compact={isCollapsed} />
        <p
          className={[
            "text-xs text-slate-500 transition-[opacity,transform] dark:text-slate-400",
            isCollapsed ? "pointer-events-none -translate-x-2 opacity-0" : "opacity-100",
          ].join(" ")}
        >
          © 2025 nick-blog
        </p>
      </div>
    </div>
  );
}
