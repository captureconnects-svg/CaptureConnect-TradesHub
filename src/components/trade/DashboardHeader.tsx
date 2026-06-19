import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Hammer, Heart, User, Calendar, Receipt, Settings, LogOut, Bell, Video } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/lib/theme";
import { CurrencySelect } from "@/lib/currency";
import { supabase } from "@/lib/supabase";

type Props = {
  likedCount: number;
  onOpenLikes: () => void;
};

interface ClientProfile {
  full_name: string | null;
  email: string | null;
  profile_image: string | null;
}

export function DashboardHeader({ likedCount, onOpenLikes }: Props) {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("client_profiles")
        .select("full_name, email, profile_image")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data as ClientProfile);
    }

    fetchProfile();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/client-login-signup" });
  }

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join("")
    : "?";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/client-dashboard" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Hammer className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg hidden sm:inline">TradeHub</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <CurrencySelect className="hidden sm:flex" />
          <ThemeToggle />

          <Button variant="ghost" size="sm" asChild>
            <Link to="/client-dashboard/testimonials">
              <Video className="h-5 w-5" />
              <span className="hidden sm:inline ml-2">Testimonials</span>
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenLikes}
            className="relative"
          >
            <Heart className="h-5 w-5" />
            <span className="hidden sm:inline ml-2">Saved</span>
            {likedCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold">
                {likedCount}
              </span>
            )}
          </Button>

          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full p-1 hover:bg-muted/50 transition-colors">
                <Avatar className="h-9 w-9">
                  {profile?.profile_image && (
                    <AvatarImage src={profile.profile_image} alt={profile.full_name ?? ""} />
                  )}
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{profile?.full_name ?? "—"}</span>
                  <span className="text-xs text-muted-foreground font-normal">{profile?.email ?? "—"}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/client-dashboard/profile">
                  <User className="h-4 w-4 mr-2" /> My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/client-dashboard/bookings">
                  <Calendar className="h-4 w-4 mr-2" /> Services
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/client-dashboard/transactions">
                  <Receipt className="h-4 w-4 mr-2" /> Transactions
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/client-dashboard/settings">
                  <Settings className="h-4 w-4 mr-2" /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="h-4 w-4 mr-2" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
