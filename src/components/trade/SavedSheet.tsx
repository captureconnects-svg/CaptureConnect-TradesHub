import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TradeCard } from "@/components/trade/TradeCard";
import { supabase } from "@/lib/supabase";
import {
  fetchClientLikes,
  fetchLikedTraderProfiles,
  toggleClientLike,
} from "@/backend/client-likes";
import type { Tradesperson } from "@/lib/trades-data";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function SavedSheet({ open, onOpenChange }: Props) {
  const [likedPros, setLikedPros] = useState<Tradesperson[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      if (cancelled || !authData.user) {
        setLoading(false);
        return;
      }
      const uid = authData.user.id;
      setClientId(uid);
      const ids = await fetchClientLikes(uid);
      if (cancelled) return;
      setLikedIds(ids);
      const pros = await fetchLikedTraderProfiles(ids);
      if (cancelled) return;
      setLikedPros(pros);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleToggle = (id: string) => {
    if (!clientId) return;
    const isLiked = likedIds.includes(id);
    setLikedIds((prev) => (isLiked ? prev.filter((x) => x !== id) : [...prev, id]));
    setLikedPros((prev) => prev.filter((p) => p.id !== id));
    toggleClientLike(clientId, id, isLiked);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" /> Saved tradespeople
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {loading ? (
            <p className="text-muted-foreground text-sm text-center py-12">
              Loading saved pros…
            </p>
          ) : likedPros.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-12">
              No saved pros yet. Tap the heart on any card to save them here.
            </p>
          ) : (
            likedPros.map((p) => (
              <TradeCard key={p.id} pro={p} liked onToggleLike={handleToggle} />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
