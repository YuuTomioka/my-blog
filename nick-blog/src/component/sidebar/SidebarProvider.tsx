"use client";

import { createContext, useContext, useMemo, useState, ReactNode } from "react";

type SidebarContextValue = {
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

/** サイドバーの状態を提供するコンポーネント */
export function SidebarProvider({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const value = useMemo(
        () => ({ open, setOpen, toggle: () => setOpen((o) => !o) }), 
        [open]
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