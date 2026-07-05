import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  getNotificationPreferences,
  upsertNotificationPreferences,
  type NotificationPreferences,
} from "@/backend/notifications";
import {
  getBrowserPermission,
  requestBrowserPermission,
  isBrowserNotificationSupported,
} from "@/lib/browser-notifications";

export function NotificationPreferencesPanel() {
  const [prefs, setPrefs] = useState<Omit<NotificationPreferences, "userId">>({
    bookingUpdates: true,
    paymentUpdates: true,
    messageUpdates: true,
    reviewUpdates: true,
    marketingUpdates: false,
    browserNotifications: true,
    emailNotifications: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<
    "granted" | "denied" | "default" | "unsupported"
  >("default");

  useEffect(() => {
    setBrowserPermission(getBrowserPermission());
    getNotificationPreferences().then((p) => {
      if (p) {
        const { userId: _uid, ...rest } = p;
        setPrefs(rest);
      }
      setLoading(false);
    });
  }, []);

  async function handleRequestBrowserPermission() {
    const result = await requestBrowserPermission();
    setBrowserPermission(result);
    if (result === "granted") {
      setPrefs((p) => ({ ...p, browserNotifications: true }));
      toast.success("Browser notifications enabled.");
    } else {
      toast.error("Browser notifications were denied. You can change this in your browser settings.");
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await upsertNotificationPreferences(prefs);
      toast.success("Notification preferences saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  }

  function toggle(key: keyof typeof prefs) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-5 w-9 rounded-full bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Activity notifications */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground">Activity</h4>
        <div className="space-y-3">
          {(
            [
              { key: "bookingUpdates", label: "Booking updates", desc: "Requests, confirmations, cancellations" },
              { key: "paymentUpdates", label: "Payment updates", desc: "Escrow, releases, refunds, withdrawals" },
              { key: "messageUpdates", label: "New messages", desc: "Incoming chat messages" },
              { key: "reviewUpdates", label: "Review notifications", desc: "New reviews and reminders" },
              { key: "marketingUpdates", label: "Marketing & promotions", desc: "Offers, tips, platform news" },
            ] as { key: keyof typeof prefs; label: string; desc: string }[]
          ).map(({ key, label, desc }) => (
            <div key={key} className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor={key} className="text-sm font-normal">
                  {label}
                </Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch
                id={key}
                checked={prefs[key] as boolean}
                onCheckedChange={() => toggle(key)}
              />
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Delivery channels */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground">Delivery channels</h4>
        <div className="space-y-3">
          {/* Email */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="emailNotifications" className="text-sm font-normal">
                Email notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                Transactional emails for important events
              </p>
            </div>
            <Switch
              id="emailNotifications"
              checked={prefs.emailNotifications}
              onCheckedChange={() => toggle("emailNotifications")}
            />
          </div>

          {/* Browser */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="browserNotifications" className="text-sm font-normal">
                Browser notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                Desktop alerts even when the tab isn't active
              </p>
              {isBrowserNotificationSupported() && browserPermission !== "granted" && (
                <button
                  onClick={handleRequestBrowserPermission}
                  className="mt-1 text-xs text-primary hover:underline"
                >
                  {browserPermission === "denied"
                    ? "Permission denied — allow in browser settings"
                    : "Click to enable browser notifications"}
                </button>
              )}
            </div>
            <Switch
              id="browserNotifications"
              checked={prefs.browserNotifications && browserPermission === "granted"}
              disabled={browserPermission !== "granted"}
              onCheckedChange={() => {
                if (browserPermission !== "granted") {
                  handleRequestBrowserPermission();
                } else {
                  toggle("browserNotifications");
                }
              }}
            />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        {saving ? "Saving…" : "Save preferences"}
      </Button>
    </div>
  );
}
