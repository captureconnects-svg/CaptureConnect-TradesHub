import type { CartItem } from "@/lib/cart-context";

const RETAIL_WHOLESALE = "Retail & Wholesale";

// ─── Trader-scoped cart helpers ───────────────────────────────────────────────

export function getTraderCartItems(items: CartItem[], traderId: string): CartItem[] {
  return items.filter((i) => i.traderId === traderId);
}

export function getTraderItemCount(items: CartItem[], traderId: string): number {
  return getTraderCartItems(items, traderId).reduce((sum, i) => sum + i.quantity, 0);
}

export function getTraderCartTotal(items: CartItem[], traderId: string): number {
  return getTraderCartItems(items, traderId).reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export interface TraderDisplayFlags {
  showShoppingCart: boolean;
  showBookingButton: boolean;
  showPackagesAndAddons: boolean;
  showBookingCTA: boolean;
  showAvailabilityCalendar: boolean;
  showTotalBookings: boolean;
  showPortfolio: boolean;
}

/**
 * Returns display flags for a trader profile based on their specialties.
 *
 * Retail-only traders (sole specialty is "Retail & Wholesale") have all
 * booking/scheduling UI removed and only show the shopping experience.
 * Traders who have Retail & Wholesale alongside other specialties get
 * the full UI including the shopping cart. Traders with no retail specialty
 * get the standard profile with no shopping UI.
 */
export function getTraderDisplayFlags(tradeSpecialties: string[]): TraderDisplayFlags {
  const hasRetail = tradeSpecialties.includes(RETAIL_WHOLESALE);
  const retailOnly = hasRetail && tradeSpecialties.length === 1;

  if (retailOnly) {
    return {
      showShoppingCart: true,
      showBookingButton: false,
      showPackagesAndAddons: false,
      showBookingCTA: false,
      showAvailabilityCalendar: false,
      showTotalBookings: false,
      showPortfolio: false,
    };
  }

  return {
    showShoppingCart: hasRetail,
    showBookingButton: true,
    showPackagesAndAddons: true,
    showBookingCTA: true,
    showAvailabilityCalendar: true,
    showTotalBookings: true,
    showPortfolio: true,
  };
}
