"use client";

import { PropsWithChildren } from "react";
import { useSidebar } from "./SidebarProvider";
import SidebarContent from "./SidebarContent";

/** サイドバー本体コンポーネント */
export default function Sidebar() {
    const { open, setOpen } = useSidebar();

    return (
        <>
            {/* 左固定のサイドバー */}
            <aside
                className={[
                    "fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-white p-4 transition-transform",
                    "md:translate-x-0",
                    open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
                ].join(" ")}
                aria-label="Sidebar"
            >
                <SidebarContent />
            </aside>

            {/* モバイル時のオーバーレイ */}
            {open && (
                <button
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    aria-label="Close sidebar overlay"
                    onClick={() => setOpen(false)}
                />
            )}
        </>
    );
}

/** コンテンツ側の左パディングを与えるラッパー（サイドバー幅分） */
export function SidebarMain({ children, className }: PropsWithChildren<{ className?: string }>) {
    // PC: 常時表示なので常にパディング、SP: 開閉に合わせず 0（オーバーレイで被せる挙動）
    const cls = ["md:pl-64", className].filter(Boolean).join(" ");
    return <main className={cls}>{children}</main>;
}
