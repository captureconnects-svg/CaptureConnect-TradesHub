import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, MapPin, User, Calendar, Heart, Star, Briefcase } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardHeader } from "@/components/trade/DashboardHeader";
import {
  fetchClientProfileData,
  updateClientProfileData,
  uploadClientProfileImage,
  fetchClientProfileStats,
  type ClientProfileData,
  type ClientProfileStats,
} from "@/backend/client-edit-profile";

export const Route = createFileRoute("/client-dashboard/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Capture Connect" },
      { name: "description", content: "Manage your TradeHub profile." },
    ],
  }),
  component: ProfilePage,
});

function formatMemberSince(createdAt: string): string {
  if (!createdAt) return "—";
  const date = new Date(createdAt);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function ProfilePage() {
  const [form, setForm] = useState<ClientProfileData>({
    fullName: "",
    username: "",
    email: "",
    dateOfBirth: "",
    gender: "",
    location: "",
    activeRole: "",
    profileImage: "",
    createdAt: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ClientProfileStats>({ tradersLiked: 0, avgRatingGiven: 0, totalBookings: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchClientProfileData().then((data) => {
      if (data) setForm(data);
      setLoading(false);
    });
    fetchClientProfileStats().then(setStats).catch(() => {});
  }, []);

  const update =
    (key: keyof ClientProfileData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateClientProfileData(form);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setError(null);
    try {
      const url = await uploadClientProfileImage(file, form.username, form.profileImage);
      const updated = { ...form, profileImage: url };
      setForm(updated);
      await updateClientProfileData(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploadingImage(false);
    }
  }

  const initials = form.fullName
    ? form.fullName.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("")
    : "?";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <DashboardHeader likedCount={0} onOpenLikes={() => {}} />

      <main className="flex-1 w-full px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/client-dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">My Profile</h1>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-center py-20">Loading profile…</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_450px] gap-6 items-start">

            {/* LEFT */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white">Personal Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" className="mt-1" placeholder="Choose a username" value={form.username} onChange={update("username")} />
                      </div>
                      <div>
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input id="fullName" className="mt-1" placeholder="Enter your full name" value={form.fullName} onChange={update("fullName")} />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" className="mt-1" placeholder="Enter your email" value={form.email} onChange={update("email")} />
                      </div>
                      <div>
                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                        <Input id="dateOfBirth" type="date" className="mt-1" value={form.dateOfBirth} onChange={update("dateOfBirth")} />
                      </div>
                      <div>
                        <Label htmlFor="gender">Gender</Label>
                        <select
                          id="gender"
                          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          value={form.gender}
                          onChange={update("gender")}
                        >
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="location">Location</Label>
                        <Input id="location" className="mt-1" placeholder="Enter your location" value={form.location} onChange={update("location")} />
                      </div>
                    </div>

                    {success && (
                      <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                        {success}
                      </p>
                    )}
                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}

                    <div className="flex justify-end">
                      <Button type="submit" disabled={saving}>
                        {saving ? "Saving…" : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white">Activity Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/30">
                      <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                        <Heart className="h-5 w-5 text-pink-500" />
                      </div>
                      <p className="text-2xl font-bold">{stats.tradersLiked}</p>
                      <p className="text-xs text-muted-foreground text-center leading-tight">Traders Liked</p>
                    </div>
                    <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/30">
                      <div className="h-10 w-10 rounded-lg bg-amber-400/10 flex items-center justify-center">
                        <Star className="h-5 w-5 text-amber-400" />
                      </div>
                      <p className="text-2xl font-bold">
                        {stats.avgRatingGiven > 0 ? stats.avgRatingGiven : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground text-center leading-tight">Avg Rating Given</p>
                    </div>
                    <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/30">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Briefcase className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-2xl font-bold">{stats.totalBookings}</p>
                      <p className="text-xs text-muted-foreground text-center leading-tight">Total Bookings</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT */}
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="relative inline-block mb-4">
                    <Avatar className="h-32 w-32 mx-auto">
                      {form.profileImage && (
                        <AvatarImage src={form.profileImage} alt={form.fullName} />
                      )}
                      <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                    </Avatar>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                    <Button
                      size="sm"
                      className="absolute bottom-0 right-0 rounded-full h-8 w-8 p-0"
                      type="button"
                      disabled={uploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {form.fullName || "—"}
                  </h2>
                  <div className="flex items-center justify-center text-gray-600 dark:text-gray-300 mb-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span className="text-sm">{form.location || "Location not set"}</span>
                  </div>
                  <div className="flex items-center justify-center text-gray-600 dark:text-gray-300 mb-4">
                    <User className="h-4 w-4 mr-1" />
                    <span className="text-sm">Member since {formatMemberSince(form.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900 dark:text-white">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to="/client-dashboard">
                      <ArrowLeft className="h-4 w-4 mr-2" /> View Dashboard
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to="/client-dashboard/bookings">
                      <Calendar className="h-4 w-4 mr-2" /> View Bookings
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to="/client-dashboard/transactions">
                      <Heart className="h-4 w-4 mr-2" /> View Transactions
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
