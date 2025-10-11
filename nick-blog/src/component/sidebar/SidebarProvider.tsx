"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SidebarContextValue = {
  /** SP: スライドイン開閉 */
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;

  /** PC: 最小化（幅を w-64 ↔ w-20） */
  desktopCollapsed: boolean;
  setDesktopCollapsed: (collapsed: boolean) => void;
  toggleDesktop: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

/** サイドバーの状態を提供するコンポーネント */
export function SidebarProvider({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  const toggleMobile = useCallback(() => setMobileOpen((open) => !open), []);
  const toggleDesktop = useCallback(
    () => setDesktopCollapsed((collapsed) => !collapsed),
    [],
  );

  const value = useMemo(
    () => ({
      mobileOpen,
      setMobileOpen,
      toggleMobile,
      desktopCollapsed,
      setDesktopCollapsed,
      toggleDesktop,
    }),
    [desktopCollapsed, mobileOpen, toggleDesktop, toggleMobile],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

/** サイドバーの状態を取得するためのカスタムフック */
export function useSidebar() {
    const ctx = useContext(SidebarContext);
    if (!ctx) {
        throw new Error("useSidebar must be used within <SidebarProvider>");
    }
    return ctx;
}
