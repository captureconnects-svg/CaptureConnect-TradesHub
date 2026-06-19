import { Star, MapPin, BadgeCheck, Heart } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/lib/currency";
import type { Tradesperson } from "@/lib/trades-data";

type Props = {
  pro: Tradesperson;
  liked: boolean;
  onToggleLike: (id: string) => void;
  fromSlug?: string;
};

export function TradeCard({ pro, liked, onToggleLike, fromSlug }: Props) {
  const { format } = useCurrency();
  return (
    <article className="group rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            {pro.profileImage && <AvatarImage src={pro.profileImage} alt={pro.name} />}
            <AvatarFallback className="bg-primary/20 text-primary font-semibold">
              {pro.initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold">{pro.name}</h3>
              {pro.verified && (
                <BadgeCheck className="h-4 w-4 text-primary" aria-label="Verified" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {pro.specialties && pro.specialties.length > 0
                ? pro.specialties.join(", ")
                : pro.trade}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onToggleLike(pro.id)}
          className="p-1.5 rounded-md hover:bg-muted/50 transition-colors"
          aria-label={liked ? "Unlike" : "Like"}
        >
          <Heart
            className={`h-5 w-5 ${liked ? "fill-primary text-primary" : "text-muted-foreground"}`}
          />
        </button>
      </div>

      <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{pro.tagline}</p>

      <div className="mt-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-primary text-primary" />
          <span className="font-medium">{pro.rating}</span>
          <span className="text-muted-foreground">({pro.reviews})</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="truncate">{pro.location}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <div>
          <span className="text-xs text-muted-foreground block">Starting from</span>
          <span className="text-lg font-bold">{format(pro.startingPrice ?? pro.hourly)}</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" asChild>
            <Link
              to="/client-dashboard/trader/$username"
              params={{ username: pro.urlSlug ?? pro.id }}
              search={fromSlug ? { from: fromSlug } : undefined}
            >
              View Profile
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
