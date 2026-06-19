import { supabase } from "@/lib/supabase";

export const RETAIL_WHOLESALE = "Retail & Wholesale";

export type TraderWorkDay = {
  day: string;
  open: boolean;
  from: string;
  to: string;
};

export type TraderPackage = {
  id: number;
  name: string;
  price: number;
  hours: number;
  description: string;
  features: string[];
};

export type TraderAddon = {
  id: number;
  name: string;
  price: number;
};

export type TraderFaq = {
  id: number;
  question: string;
  answer: string;
};

export type TraderCertification = {
  id: number;
  name: string;
};

export type TraderProductVariant = {
  id: number;
  size: string;
  color: string;
  price: number;
  quantity: number;
};

export type TraderProduct = {
  id: number;
  name: string;
  description: string;
  image: string;
  images: string[];
  imageIds: number[];
  price: number;
  quantity: number;
  variants: TraderProductVariant[];
};

export type TraderPortfolioMedia = {
  id: number;
  mediaUrl: string;
};

export type TraderPortfolio = {
  id: number;
  title: string;
  description: string;
  category: string;
  media: TraderPortfolioMedia[];
};

export type TraderCardData = {
  fullName: string;
  username: string;
  bio: string;
  location: string;
  yearsExp: number;
  responseTime: number;
  profileImage: string;
  tradeSpecialties: string[];
  workDays: TraderWorkDay[];
  faqs: TraderFaq[];
  certifications: TraderCertification[];
  packages: TraderPackage[];
  addons: TraderAddon[];
  products: TraderProduct[];
  portfolios: TraderPortfolio[];
  startingPrice: number;
};

function computeStartingPrice(
  tradeSpecialties: string[],
  packages: TraderPackage[],
  products: TraderProduct[],
): number {
  const hasRetail = tradeSpecialties.includes(RETAIL_WHOLESALE);
  const retailOnly = hasRetail && tradeSpecialties.length === 1;

  const packagePrices = packages.map((p) => p.price).filter((p) => p > 0);
  const productPrices = products.map((p) => p.price).filter((p) => p > 0);

  let allPrices: number[];
  if (retailOnly) {
    allPrices = productPrices;
  } else if (hasRetail) {
    allPrices = [...productPrices, ...packagePrices];
  } else {
    allPrices = packagePrices;
  }

  return allPrices.length > 0 ? Math.min(...allPrices) : 0;
}

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const EMPTY: TraderCardData = {
  fullName: "",
  username: "",
  bio: "",
  location: "",
  yearsExp: 0,
  responseTime: 0,
  profileImage: "",
  tradeSpecialties: [],
  workDays: ALL_DAYS.map((day) => ({ day, open: false, from: "", to: "" })),
  faqs: [],
  certifications: [],
  packages: [],
  addons: [],
  products: [] as TraderProduct[],
  portfolios: [] as TraderPortfolio[],
  startingPrice: 0,
};

export async function fetchTraderCardData(tradespersonId: string): Promise<TraderCardData> {
  try {
    const [
      profileRes,
      workDaysRes,
      faqRes,
      certRes,
      packagesRes,
      addOnsRes,
      productsRes,
      specialtiesRes,
      portfoliosRes,
    ] = await Promise.all([
      supabase.from("tradesperson_profiles").select("*").eq("id", tradespersonId).single(),
      supabase.from("tradesperson_WorkDays").select("*").eq("tradesperson_id", tradespersonId),
      supabase.from("tradesperson_FAQ").select("*").eq("tradesperson_id", tradespersonId),
      supabase.from("tradesperson_certification").select("*").eq("tradesperson_id", tradespersonId),
      supabase.from("tradesperson_packages").select("*").eq("tradesperson_id", tradespersonId),
      supabase.from("tradesperson_addOns").select("*").eq("tradesperson_id", tradespersonId),
      supabase.from("tradesperson_SellersSpecialty").select("*").eq("tradesperson_id", tradespersonId),
      supabase.from("tradesperson_specialty").select("*").eq("tradesperson_id", tradespersonId),
      supabase.from("tradesperson_portfolios").select("*").eq("tradesperson_id", tradespersonId).order("created_at", { ascending: false }),
    ]);

    const p = profileRes.data as Record<string, unknown> | null;

    const dbWorkDays = ((workDaysRes.data ?? []) as Record<string, unknown>[]);
    const workDayMap = new Map(
      dbWorkDays.map((r) => [r.workday as string, { from: r.startTime as string, to: r.endTime as string }])
    );
    const workDays: TraderWorkDay[] = ALL_DAYS.map((day) => {
      const entry = workDayMap.get(day);
      return { day, open: !!entry, from: entry?.from ?? "", to: entry?.to ?? "" };
    });

    const packages: TraderPackage[] = ((packagesRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
      id: r.id as number,
      name: r.package_name as string,
      price: parseFloat(String(r.package_price ?? "0")),
      hours: (r.package_duration as number) ?? 0,
      description: (r.package_desc as string) ?? "",
      features: ((r.package_feat as string) ?? "").split("\n").filter(Boolean),
    }));

    const rawProducts = ((productsRes.data ?? []) as Record<string, unknown>[]);
    const variantsByProductId = new Map<number, TraderProductVariant[]>();
    const imagesByProductId = new Map<number, { id: number; url: string }[]>();
    if (rawProducts.length > 0) {
      const productIds = rawProducts.map((r) => r.id as number);
      const [{ data: variantData }, { data: imageData }] = await Promise.all([
        supabase.from("tradesperson_Sell.Spe.variant").select("*").in("product_id", productIds),
        supabase.from("tradesperson_Sell.Spe.images").select("id, product_id, product_imgURL").in("product_id", productIds),
      ]);
      ((variantData ?? []) as Record<string, unknown>[]).forEach((v) => {
        const pid = v.product_id as number;
        if (!variantsByProductId.has(pid)) variantsByProductId.set(pid, []);
        variantsByProductId.get(pid)!.push({
          id: v.id as number,
          size: (v.product_size as string) ?? "",
          color: (v.product_color as string) ?? "",
          price: parseFloat(String(v.product_price ?? "0")),
          quantity: (v.product_quantity as number) ?? 0,
        });
      });
      ((imageData ?? []) as Record<string, unknown>[]).forEach((img) => {
        const pid = img.product_id as number;
        if (!imagesByProductId.has(pid)) imagesByProductId.set(pid, []);
        imagesByProductId.get(pid)!.push({ id: img.id as number, url: (img.product_imgURL as string) ?? "" });
      });
    }
    const products: TraderProduct[] = rawProducts.map((r) => {
      const variants = variantsByProductId.get(r.id as number) ?? [];
      const prices = variants.map((v) => v.price).filter((p) => p > 0);
      const imgRecords = (imagesByProductId.get(r.id as number) ?? []).filter((i) => i.url);
      return {
        id: r.id as number,
        name: r.product_name as string,
        description: (r.product_description as string) ?? "",
        image: imgRecords[0]?.url ?? "",
        images: imgRecords.map((i) => i.url),
        imageIds: imgRecords.map((i) => i.id),
        price: prices.length > 0 ? Math.min(...prices) : 0,
        quantity: variants.reduce((sum, v) => sum + v.quantity, 0),
        variants,
      };
    });

    const tradeSpecialties = ((specialtiesRes.data ?? []) as Record<string, unknown>[]).map((r) => r.specialty as string);

    // Build portfolios — query uses tradesperson_id column; returns empty if column absent
    const rawPortfolios = ((portfoliosRes.data ?? []) as Record<string, unknown>[]);
    let portfolios: TraderPortfolio[] = [];
    if (rawPortfolios.length > 0) {
      const portfolioIds = rawPortfolios.map((r) => r.id as number);
      const { data: mediaData } = await supabase
        .from("tradesperson_port.media")
        .select("id, portfolio_id, portfolio_URL")
        .in("portfolio_id", portfolioIds);
      const mediaByPortfolioId = new Map<number, TraderPortfolioMedia[]>();
      ((mediaData ?? []) as Record<string, unknown>[]).forEach((m) => {
        const pid = m.portfolio_id as number;
        if (!mediaByPortfolioId.has(pid)) mediaByPortfolioId.set(pid, []);
        mediaByPortfolioId.get(pid)!.push({ id: m.id as number, mediaUrl: (m.portfolio_URL as string) ?? "" });
      });
      portfolios = rawPortfolios.map((r) => ({
        id: r.id as number,
        title: (r.portfolio_title as string) ?? "",
        description: (r.portfolio_descr as string) ?? "",
        category: (r.portfolio_categ as string) ?? "",
        media: mediaByPortfolioId.get(r.id as number) ?? [],
      }));
    }

    return {
      fullName: (p?.full_name as string) ?? "",
      username: (p?.username as string) ?? "",
      bio: (p?.about as string) ?? "",
      location: (p?.location as string) ?? "",
      yearsExp: (p?.years_of_experience as number) ?? 0,
      responseTime: (p?.response_time as number) ?? 0,
      profileImage: (p?.profile_image as string) ?? "",
      tradeSpecialties,
      workDays,
      faqs: ((faqRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
        id: r.id as number,
        question: r.FAQ_question as string,
        answer: r.FAQ_answer as string,
      })),
      certifications: ((certRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
        id: r.id as number,
        name: r.certification as string,
      })),
      packages,
      addons: ((addOnsRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
        id: r.id as number,
        name: r.addOn_name as string,
        price: parseFloat(String(r.addOn_price ?? "0")),
      })),
      products,
      portfolios,
      startingPrice: computeStartingPrice(tradeSpecialties, packages, products),
    };
  } catch {
    return { ...EMPTY };
  }
}

/**
 * Bulk-fetches the starting price for a set of traders.
 * @param traderSpecialties - map of tradesperson_id -> their specialty names
 * @returns map of tradesperson_id -> starting price (0 when no pricing found)
 */
export async function fetchStartingPricesForTraders(
  traderSpecialties: Record<string, string[]>,
): Promise<Record<string, number>> {
  const ids = Object.keys(traderSpecialties);
  if (ids.length === 0) return {};

  const [packagesRes, productsRes] = await Promise.all([
    supabase
      .from("tradesperson_packages")
      .select("tradesperson_id, package_price")
      .in("tradesperson_id", ids),
    supabase
      .from("tradesperson_SellersSpecialty")
      .select("id, tradesperson_id")
      .in("tradesperson_id", ids),
  ]);

  // package prices keyed by trader
  const packagePricesByTrader: Record<string, number[]> = {};
  for (const row of (packagesRes.data ?? []) as Record<string, unknown>[]) {
    const tid = row.tradesperson_id as string;
    const price = parseFloat(String(row.package_price ?? "0"));
    if (price > 0) {
      if (!packagePricesByTrader[tid]) packagePricesByTrader[tid] = [];
      packagePricesByTrader[tid].push(price);
    }
  }

  // product id -> trader id map
  const rawProducts = (productsRes.data ?? []) as Record<string, unknown>[];
  const productToTrader: Record<number, string> = {};
  for (const row of rawProducts) {
    productToTrader[row.id as number] = row.tradesperson_id as string;
  }

  // product prices keyed by trader (via variant prices)
  const productPricesByTrader: Record<string, number[]> = {};
  if (rawProducts.length > 0) {
    const productIds = rawProducts.map((r) => r.id as number);
    const { data: variantData } = await supabase
      .from("tradesperson_Sell.Spe.variant")
      .select("product_id, product_price")
      .in("product_id", productIds);

    for (const v of (variantData ?? []) as Record<string, unknown>[]) {
      const tid = productToTrader[v.product_id as number];
      if (!tid) continue;
      const price = parseFloat(String(v.product_price ?? "0"));
      if (price > 0) {
        if (!productPricesByTrader[tid]) productPricesByTrader[tid] = [];
        productPricesByTrader[tid].push(price);
      }
    }
  }

  const result: Record<string, number> = {};
  for (const [tid, specialties] of Object.entries(traderSpecialties)) {
    const hasRetail = specialties.includes(RETAIL_WHOLESALE);
    const retailOnly = hasRetail && specialties.length === 1;

    let allPrices: number[];
    if (retailOnly) {
      allPrices = productPricesByTrader[tid] ?? [];
    } else if (hasRetail) {
      allPrices = [...(productPricesByTrader[tid] ?? []), ...(packagePricesByTrader[tid] ?? [])];
    } else {
      allPrices = packagePricesByTrader[tid] ?? [];
    }

    result[tid] = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  }

  return result;
}
