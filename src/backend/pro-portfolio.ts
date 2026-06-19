import { supabase } from "@/lib/supabase";

export type PortfolioMedia = {
  id: number;
  portfolioId: number;
  mediaUrl: string;
  createdAt: string;
};

export type Portfolio = {
  id: number;
  title: string;
  description: string;
  category: string;
  createdAt: string;
  media: PortfolioMedia[];
};

export const MAX_MEDIA_PER_PORTFOLIO = 5;

function extractStoragePath(url: string): string {
  const marker = "/pro_portfolios/";
  const idx = url.indexOf(marker);
  return idx === -1 ? url : url.slice(idx + marker.length);
}

export async function fetchPortfolios(): Promise<Portfolio[]> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Not authenticated");

  const { data: portData, error: portError } = await supabase
    .from("tradesperson_portfolios")
    .select("*")
    .order("created_at", { ascending: false });

  if (portError) throw new Error(portError.message);
  if (!portData || portData.length === 0) return [];

  const portfolioIds = (portData as Record<string, unknown>[]).map((r) => r.id as number);

  const { data: mediaData, error: mediaError } = await supabase
    .from("tradesperson_port.media")
    .select("*")
    .in("portfolio_id", portfolioIds);

  if (mediaError) throw new Error(mediaError.message);

  const media = ((mediaData ?? []) as Record<string, unknown>[]).map((r) => ({
    id:          r.id            as number,
    portfolioId: r.portfolio_id  as number,
    mediaUrl:    r.portfolio_URL as string,
    createdAt:   r.created_at   as string,
  }));

  return (portData as Record<string, unknown>[]).map((r) => ({
    id:          r.id               as number,
    title:       r.portfolio_title  as string,
    description: r.portfolio_descr  as string,
    category:    r.portfolio_categ  as string,
    createdAt:   r.created_at       as string,
    media:       media.filter((m) => m.portfolioId === (r.id as number)),
  }));
}

export async function createPortfolio(
  title: string,
  description: string,
  category: string
): Promise<Portfolio> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("tradesperson_portfolios")
    .insert({ tradesperson_id: authData.user.id, portfolio_title: title, portfolio_descr: description, portfolio_categ: category })
    .select()
    .single();

  if (error) throw new Error(error.message);
  const r = data as Record<string, unknown>;
  return {
    id:          r.id              as number,
    title:       r.portfolio_title as string,
    description: r.portfolio_descr as string,
    category:    r.portfolio_categ as string,
    createdAt:   r.created_at      as string,
    media:       [],
  };
}

export async function uploadPortfolioMedia(file: File, portfolioId: number): Promise<string> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Not authenticated");

  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${authData.user.id}/${portfolioId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("pro_portfolios")
    .upload(path, file, { upsert: true });

  if (uploadError) throw new Error(uploadError.message);

  const { data: urlData } = supabase.storage.from("pro_portfolios").getPublicUrl(path);
  return urlData.publicUrl;
}

export async function savePortfolioMediaUrl(
  portfolioId: number,
  mediaUrl: string
): Promise<PortfolioMedia> {
  const { data, error } = await supabase
    .from("tradesperson_port.media")
    .insert({ portfolio_id: portfolioId, portfolio_URL: mediaUrl })
    .select()
    .single();

  if (error) throw new Error(error.message);
  const r = data as Record<string, unknown>;
  return {
    id:          r.id            as number,
    portfolioId: r.portfolio_id  as number,
    mediaUrl:    r.portfolio_URL as string,
    createdAt:   r.created_at   as string,
  };
}

export async function deletePortfolioMedia(mediaId: number, mediaUrl: string): Promise<void> {
  const path = extractStoragePath(mediaUrl);
  await supabase.storage.from("pro_portfolios").remove([path]);

  const { error } = await supabase
    .from("tradesperson_port.media")
    .delete()
    .eq("id", mediaId);

  if (error) throw new Error(error.message);
}

export async function updatePortfolio(
  portfolioId: number,
  title: string,
  description: string,
  category: string
): Promise<void> {
  const { error } = await supabase
    .from("tradesperson_portfolios")
    .update({ portfolio_title: title, portfolio_descr: description, portfolio_categ: category })
    .eq("id", portfolioId);
  if (error) throw new Error(error.message);
}

export async function deletePortfolio(portfolio: Portfolio): Promise<void> {
  for (const m of portfolio.media) {
    await deletePortfolioMedia(m.id, m.mediaUrl);
  }

  const { error } = await supabase
    .from("tradesperson_portfolios")
    .delete()
    .eq("id", portfolio.id);

  if (error) throw new Error(error.message);
}
