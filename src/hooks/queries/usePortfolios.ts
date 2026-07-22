import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchPortfolios,
  createPortfolio,
  updatePortfolio,
  uploadPortfolioMedia,
  savePortfolioMediaUrl,
  deletePortfolioMedia,
  deletePortfolio,
  type Portfolio,
  type PortfolioMedia,
} from "@/backend/pro-portfolio";
import { queryKeys } from "@/lib/query-keys";

const ME = "me";

export function usePortfolios() {
  const queryClient = useQueryClient();
  const key = queryKeys.portfolios(ME);

  const query = useQuery({
    queryKey: key,
    queryFn: fetchPortfolios,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  function setPortfolios(updater: (prev: Portfolio[]) => Portfolio[]) {
    queryClient.setQueryData<Portfolio[]>(key, (prev) => updater(prev ?? []));
  }

  const create = useMutation({
    mutationFn: async ({ title, description, category, files }: { title: string; description: string; category: string; files: File[] }) => {
      const portfolio = await createPortfolio(title, description, category);
      for (const file of files) {
        const url = await uploadPortfolioMedia(file, portfolio.id);
        const media = await savePortfolioMediaUrl(portfolio.id, url);
        portfolio.media.push(media);
      }
      return portfolio;
    },
    onSuccess: (portfolio) => setPortfolios((prev) => [portfolio, ...prev]),
  });

  const update = useMutation({
    mutationFn: async ({
      portfolio, title, description, category, newFiles,
    }: { portfolio: Portfolio; title: string; description: string; category: string; newFiles: File[] }) => {
      await updatePortfolio(portfolio.id, title, description, category);
      const newMedia: PortfolioMedia[] = [];
      for (const file of newFiles) {
        const url = await uploadPortfolioMedia(file, portfolio.id);
        const media = await savePortfolioMediaUrl(portfolio.id, url);
        newMedia.push(media);
      }
      return { portfolioId: portfolio.id, title, description, category, newMedia };
    },
    onSuccess: ({ portfolioId, title, description, category, newMedia }) =>
      setPortfolios((prev) =>
        prev.map((p) =>
          p.id === portfolioId ? { ...p, title, description, category, media: [...p.media, ...newMedia] } : p,
        ),
      ),
  });

  const remove = useMutation({
    mutationFn: (portfolio: Portfolio) => deletePortfolio(portfolio),
    onSuccess: (_result, portfolio) => setPortfolios((prev) => prev.filter((p) => p.id !== portfolio.id)),
  });

  const removeMedia = useMutation({
    mutationFn: ({ media }: { portfolioId: number; media: PortfolioMedia }) => deletePortfolioMedia(media.id, media.mediaUrl),
    onSuccess: (_result, { portfolioId, media }) =>
      setPortfolios((prev) =>
        prev.map((p) => (p.id === portfolioId ? { ...p, media: p.media.filter((m) => m.id !== media.id) } : p)),
      ),
  });

  return {
    portfolios: query.data ?? [],
    isLoading: query.isLoading,
    createPortfolio: create.mutateAsync,
    isCreating: create.isPending,
    updatePortfolio: update.mutateAsync,
    isUpdating: update.isPending,
    deletePortfolio: remove.mutateAsync,
    deletingId: remove.isPending ? (remove.variables?.id ?? null) : null,
    deletePortfolioMedia: removeMedia.mutateAsync,
  };
}
