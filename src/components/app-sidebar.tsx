"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";

export function AppSidebar({
  role,
  unreadCount,
  canViewAnalytics,
}: {
  role: "ADMIN" | "USER";
  unreadCount: number;
  canViewAnalytics: boolean;
}) {
  const pathname = usePathname();

  const items = NAV_ITEMS.filter((item) => {
    if (item.analyticsAccess) return canViewAnalytics;
    return !item.adminOnly || role === "ADMIN";
  });

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex flex-col gap-2 px-5 pb-4 pt-5">
        <Image src="/brand/zeni-logo-dark-bg.svg" alt="Zeni" width={96} height={28} priority />
        <p className="text-[13px] font-medium text-sidebar-foreground/70">AI Certification</p>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors duration-120",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-pearl"
              )}
            >
              <Icon className={cn("size-4 shrink-0", active ? "text-jade" : "text-sidebar-foreground/70")} />
              <span className="flex-1">{item.label}</span>
              {item.showUnreadBadge && unreadCount > 0 && (
                <span className="rounded-full bg-pearl/10 px-1.5 py-0.5 text-[11px] tabular-nums text-pearl/70">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
              {item.adminOnly && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  Admin
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
