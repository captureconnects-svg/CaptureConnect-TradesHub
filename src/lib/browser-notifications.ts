const APP_ICON = "/favicon.ico";

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getBrowserPermission(): NotificationPermission | "unsupported" {
  if (!isBrowserNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestBrowserPermission(): Promise<NotificationPermission> {
  if (!isBrowserNotificationSupported()) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return await Notification.requestPermission();
}

export interface BrowserNotificationOptions {
  title: string;
  body: string;
  link?: string | null;
}

export function showBrowserNotification(options: BrowserNotificationOptions): boolean {
  if (!isBrowserNotificationSupported()) return false;
  if (Notification.permission !== "granted") return false;

  const notification = new Notification(options.title, {
    body: options.body,
    icon: APP_ICON,
    badge: APP_ICON,
  });

  if (options.link) {
    notification.onclick = () => {
      window.focus();
      window.location.href = options.link!;
      notification.close();
    };
  }

  return true;
}
