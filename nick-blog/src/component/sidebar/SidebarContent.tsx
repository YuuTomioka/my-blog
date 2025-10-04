"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "./SidebarProvider";

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

/** サイドバーのコンテンツ部分 */
export default function SidebarContent() {
    const pathname = usePathname();
    const { setOpen } = useSidebar();

    return(
        <div className="flex h-hull flex-col">
            <div className="mb-6 px-2 text-lg font-semibold">My Sidebar</div>
            <nav className="space-y-1">
                {NAV_SAMPLE.map((item) => {
                    const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={[
                                "block rounded-xl px-3 py-2 text-sm",
                                active ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100",
                            ].join(" ")}
                            onClick={() => setOpen(false)}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}