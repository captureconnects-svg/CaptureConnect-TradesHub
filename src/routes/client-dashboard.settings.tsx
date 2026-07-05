import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Bell, Lock, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardHeader } from "@/components/trade/DashboardHeader";
import { toast } from "sonner";
import { changePassword, deleteAccount } from "@/backend/account-settings";
import { switchToProAccount } from "@/backend/switch-account";
import { NotificationPreferencesPanel } from "@/components/trade/notification-preferences";

export const Route = createFileRoute("/client-dashboard/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Capture Connect" },
      { name: "description", content: "Manage your TradeHub account settings." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [switchingToPro, setSwitchingToPro] = useState(false);
  const [confirmSwitchToPro, setConfirmSwitchToPro] = useState(false);

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleSwitchToPro() {
    if (!confirmSwitchToPro) {
      setConfirmSwitchToPro(true);
      return;
    }
    setSwitchingToPro(true);
    try {
      await switchToProAccount();
      toast.success("Switched to pro account. Please sign in as a pro.");
      navigate({ to: "/pro-login-signup" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to switch account");
      setConfirmSwitchToPro(false);
    } finally {
      setSwitchingToPro(false);
    }
  }

  async function handleDeleteAccount() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeletingAccount(true);
    try {
      await deleteAccount();
      toast.success("Account deleted");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
      setConfirmingDelete(false);
    } finally {
      setDeletingAccount(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardHeader likedCount={0} onOpenLikes={() => {}} />
      <main className="container mx-auto px-4 py-8 max-w-[1400px] space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/client-dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Notification Preferences */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" /> Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NotificationPreferencesPanel />
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6 items-start">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Change Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Current password</Label>
                  <Input
                    type="password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>New password</Label>
                  <Input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm new password</Label>
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button className="mt-2" onClick={handleChangePassword} disabled={changingPassword}>
                  {changingPassword ? "Updating..." : "Update Password"}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" /> Switch Account
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Switch to your pro account. Your client profile will be deactivated and you'll be signed out to sign in as a pro.
                  </p>
                  {confirmSwitchToPro && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                      Are you sure? Click again to switch accounts.
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSwitchToPro}
                    disabled={switchingToPro}
                  >
                    {switchingToPro ? "Switching..." : confirmSwitchToPro ? "Yes, Switch to Pro" : "Switch to Pro Account"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-destructive/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-destructive flex items-center gap-2">
                    <Trash2 className="h-4 w-4" /> Danger Zone
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Once you delete your account, all your data will be permanently removed. This
                    action cannot be undone.
                  </p>
                  {confirmingDelete && (
                    <p className="text-sm text-destructive font-medium mb-2">
                      Are you sure? Click again to permanently delete your account.
                    </p>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteAccount}
                    disabled={deletingAccount}
                  >
                    {deletingAccount ? "Deleting..." : confirmingDelete ? "Yes, Delete My Account" : "Delete Account"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
