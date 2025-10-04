"use client";

import { useSidebar } from "./SidebarProvider";

/** モバイル用のサイドバー開閉ボタン */
export default function SidebarToggleMobile() {
    const { open, toggle } = useSidebar();

    return (
        <button
            aria-label={open ? "Close sidebar" : "Open sidebar"}
            className="rounded-xl border px-3 py-2 text-sm md:hidden"
            onClick={toggle}
        >
            {open ? "Close" : "Open"}
        </button>
    )
}