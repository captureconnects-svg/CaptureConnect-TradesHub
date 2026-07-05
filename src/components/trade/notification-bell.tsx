import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/hooks/useNotifications";
import type { Notification } from "@/backend/notifications";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const TYPE_COLORS: Record<Notification["type"], string> = {
  booking: "bg-blue-500",
  payment: "bg-green-500",
  message: "bg-purple-500",
  review: "bg-yellow-500",
  verification: "bg-orange-500",
  admin: "bg-red-500",
  auth: "bg-slate-500",
};

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string, link: string | null) => void;
}) {
  return (
    <button
      onClick={() => onRead(notification.id, notification.link)}
      className={cn(
        "w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors flex gap-3 items-start",
        !notification.isRead && "bg-accent/20"
      )}
    >
      <span
        className={cn(
          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
          TYPE_COLORS[notification.type],
          notification.isRead && "opacity-30"
        )}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm leading-tight",
            notification.isRead ? "text-muted-foreground" : "font-medium text-foreground"
          )}
        >
          {notification.title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
          {notification.message}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
      {notification.link && (
        <ExternalLink className="mt-1 h-3 w-3 shrink-0 text-muted-foreground/40" />
      )}
    </button>
  );
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotifications();
  const [open, setOpen] = useState(false);

  async function handleRead(id: string, link: string | null) {
    await markAsRead(id);
    setOpen(false);
    if (link) {
      // Internal links start with "/" — use router; external links use window.location
      if (link.startsWith("/")) {
        navigate({ to: link as never });
      } else {
        window.open(link, "_blank", "noopener,noreferrer");
      }
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-[10px] leading-none flex items-center justify-center"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 p-0 shadow-lg"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => markAllAsRead()}
            >
              <CheckCheck className="mr-1 h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        <Separator />

        {/* List */}
        <ScrollArea className="h-[360px]">
          {loading ? (
            <div className="flex flex-col gap-2 p-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 rounded bg-muted" />
                    <div className="h-3 w-full rounded bg-muted" />
                    <div className="h-2.5 w-1/3 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Check className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">You're all caught up</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} onRead={handleRead} />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
