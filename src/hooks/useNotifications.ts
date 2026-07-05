import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  getNotifications,
  getUnreadCount,
  markAsRead as markAsReadBackend,
  markAllAsRead as markAllAsReadBackend,
  markBrowserSent,
  type Notification,
} from "@/backend/notifications";
import {
  getBrowserPermission,
  showBrowserNotification,
} from "@/lib/browser-notifications";

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = useCallback(async () => {
    const [items, count] = await Promise.all([getNotifications(), getUnreadCount()]);
    setNotifications(items);
    setUnreadCount(count);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    load();

    // Subscribe to realtime inserts for the current user
    supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      const uid = data.user.id;

      // Unique topic prevents Supabase from returning an existing subscribed channel
      // (supabase.channel() deduplicates by name; removeChannel is async so the old
      // channel can still be in the registry when the next subscription attempt runs)
      const channel = supabase
        .channel(`notifications:${uid}:${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            const row = payload.new as {
              id: string;
              user_id: string;
              title: string;
              message: string;
              type: string;
              link: string | null;
              is_read: boolean;
              email_sent: boolean;
              browser_sent: boolean;
              created_at: string;
            };

            const incoming: Notification = {
              id: row.id,
              userId: row.user_id,
              title: row.title,
              message: row.message,
              type: row.type as Notification["type"],
              link: row.link,
              isRead: row.is_read,
              emailSent: row.email_sent,
              browserSent: row.browser_sent,
              createdAt: row.created_at,
            };

            // Prepend to list and bump unread count
            setNotifications((prev) => [incoming, ...prev]);
            setUnreadCount((prev) => prev + 1);

            // In-app toast
            toast(incoming.title, {
              description: incoming.message,
              action: incoming.link
                ? { label: "View", onClick: () => (window.location.href = incoming.link!) }
                : undefined,
            });

            // Browser notification (fire-and-forget; don't block on it)
            if (!row.browser_sent && getBrowserPermission() === "granted") {
              const fired = showBrowserNotification({
                title: incoming.title,
                body: incoming.message,
                link: incoming.link,
              });
              if (fired) markBrowserSent(row.id);
            }
          }
        )
        .subscribe();

      channelRef.current = channel;
    });

    return () => {
      active = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [load]);

  const markAsRead = useCallback(async (id: string) => {
    await markAsReadBackend(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await markAllAsReadBackend();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: load,
  };
}
