/**
 * useCurrencyConversion – React hook for USD↔JMD conversion.
 *
 * Features:
 *   - In-memory cache keyed by `${amount}_${from}_${to}` with a 1-hour TTL.
 *   - Tracks loading and error states.
 *   - Returns a stable `convert` callback that debounces identical calls.
 */

import { useCallback, useRef, useState } from "react";
import { convertCurrency, formatCurrency } from "@/lib/currencyConvert";
import type { ConversionResult, SupportedCurrency } from "@/lib/currencyConvert";

// ── Cache ──────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60 * 60 * 1_000; // 1 hour

interface CacheEntry {
  result: ConversionResult;
  expiresAt: number;
}

// Module-level cache shared across all hook instances in a session
const conversionCache = new Map<string, CacheEntry>();

function cacheKey(amount: number, from: SupportedCurrency, to: SupportedCurrency): string {
  return `${amount}_${from}_${to}`;
}

function getCached(amount: number, from: SupportedCurrency, to: SupportedCurrency): ConversionResult | null {
  const entry = conversionCache.get(cacheKey(amount, from, to));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    conversionCache.delete(cacheKey(amount, from, to));
    return null;
  }
  return entry.result;
}

function setCache(result: ConversionResult): void {
  const key = cacheKey(result.original_amount, result.from_currency, result.to_currency);
  conversionCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── Hook ───────────────────────────────────────────────────────────────────

export interface UseCurrencyConversionReturn {
  /** The most recent successful conversion result. */
  result: ConversionResult | null;
  /** True while a network request is in-flight. */
  loading: boolean;
  /** Non-null when the last conversion attempt failed. */
  error: string | null;
  /**
   * Trigger a conversion. Returns the result directly so callers can `await`
   * it without relying on the `result` state update cycle.
   */
  convert: (
    amount: number,
    from: SupportedCurrency,
    to: SupportedCurrency
  ) => Promise<ConversionResult | null>;
  /** Convenience: formats a USD amount as the given currency string. */
  format: (amount: number, currency: SupportedCurrency) => string;
  /** Clear the error state. */
  clearError: () => void;
}

export function useCurrencyConversion(): UseCurrencyConversionReturn {
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent stale responses from a previous call overwriting a newer one
  const requestIdRef = useRef(0);

  const convert = useCallback(
    async (
      amount: number,
      from: SupportedCurrency,
      to: SupportedCurrency
    ): Promise<ConversionResult | null> => {
      // Return cached hit immediately without a loading flash
      const cached = getCached(amount, from, to);
      if (cached) {
        setResult(cached);
        setError(null);
        return cached;
      }

      const id = ++requestIdRef.current;
      setLoading(true);
      setError(null);

      try {
        const data = await convertCurrency(amount, from, to);

        // Discard if a newer request has already resolved
        if (id !== requestIdRef.current) return null;

        setCache(data);
        setResult(data);
        return data;
      } catch (err) {
        if (id !== requestIdRef.current) return null;

        const msg = err instanceof Error ? err.message : "Currency conversion failed.";
        setError(msg);
        return null;
      } finally {
        if (id === requestIdRef.current) setLoading(false);
      }
    },
    []
  );

  const clearError = useCallback(() => setError(null), []);

  return { result, loading, error, convert, format: formatCurrency, clearError };
}
