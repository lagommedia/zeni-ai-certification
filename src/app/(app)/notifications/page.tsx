import { formatDistanceToNow } from "date-fns";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Award, Bell, CheckCheck, Info, TriangleAlert } from "lucide-react";
import { markAllNotificationsReadAction, markNotificationReadAction } from "./actions";

const TYPE_ICON: Record<string, typeof Info> = {
  INFO: Info,
  SUCCESS: CheckCheck,
  WARNING: TriangleAlert,
  CERTIFICATE: Award,
};

const TYPE_COLOR: Record<string, string> = {
  INFO: "bg-info-light text-info",
  SUCCESS: "bg-success-light text-success",
  WARNING: "bg-warning-light text-[#7a5715]",
  CERTIFICATE: "bg-jade-light text-sapphire-dark",
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-h4 font-medium text-sapphire">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up."}
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" variant="outline" size="sm">
              <CheckCheck className="size-4" />
              Mark all as read
            </Button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card py-16 text-center">
          <Bell className="size-10 text-muted-foreground" />
          <p className="font-medium">No notifications yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Course updates, reminders, and certificate alerts will show up here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((notification) => {
            const Icon = TYPE_ICON[notification.type] ?? Info;
            return (
              <div
                key={notification.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border bg-card p-4",
                  !notification.read && "border-primary/30 bg-primary/5"
                )}
              >
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    TYPE_COLOR[notification.type]
                  )}
                >
                  <Icon className="size-4.5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{notification.title}</p>
                    {!notification.read && <span className="size-1.5 rounded-full bg-primary" />}
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                  </p>
                </div>
                <form action={markNotificationReadAction}>
                  <input type="hidden" name="notificationId" value={notification.id} />
                  <input type="hidden" name="nextRead" value={(!notification.read).toString()} />
                  <Button type="submit" variant="ghost" size="sm">
                    {notification.read ? "Mark unread" : "Mark read"}
                  </Button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
