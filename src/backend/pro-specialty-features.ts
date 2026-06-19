const RETAIL = "Retail & Wholesale";

export interface SpecialtyFeatureFlags {
  showMerchandise: boolean;
  showBookings: boolean;
  showPackagesAndAddons: boolean;
  showPortfolio: boolean;
}

export function getSpecialtyFeatureFlags(tradeSpecialties: string[]): SpecialtyFeatureFlags {
  const hasRetail = tradeSpecialties.includes(RETAIL);
  const retailOnly = hasRetail && tradeSpecialties.length === 1;

  return {
    showMerchandise: hasRetail,
    showBookings: !retailOnly,
    showPackagesAndAddons: !retailOnly,
    showPortfolio: !retailOnly,
  };
}
