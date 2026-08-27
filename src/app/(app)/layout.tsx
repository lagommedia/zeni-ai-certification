import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { UserMenu } from "@/components/user-menu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  // A session cookie can outlive the user it points to (e.g. the database
  // was reseeded). Route through /api/session/clear so the stale cookie is
  // removed before we land back on /login — otherwise middleware, which only
  // checks that the cookie is validly signed, bounces us straight back.
  if (!user) redirect("/api/session/clear");

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });

  // Team Lead is a per-team designation, not a Role — Admins always see
  // Analytics; everyone else only sees it if they lead some team.
  const canViewAnalytics =
    user.role === "ADMIN" ||
    (await prisma.team.findUnique({ where: { leadUserId: user.id }, select: { id: true } })) !==
      null;

  return (
    <div className="flex min-h-svh w-full">
      <AppSidebar role={user.role} unreadCount={unreadCount} canViewAnalytics={canViewAnalytics} />
      <div className="flex min-h-svh flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-15 items-center justify-between border-b bg-card/85 px-4 backdrop-blur-md md:px-7">
          <div className="flex items-center gap-2">
            <MobileNav role={user.role} unreadCount={unreadCount} canViewAnalytics={canViewAnalytics} />
          </div>
          <UserMenu
            user={{
              name: user.name,
              email: user.email,
              role: user.role,
              title: user.title,
              avatarColor: user.avatarColor,
            }}
          />
        </header>
        <main className="flex-1 px-4 py-7 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
