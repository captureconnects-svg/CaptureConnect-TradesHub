import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type CurrencyCode = "USD" | "JMD";

type Meta = { code: CurrencyCode; symbol: string; label: string; rate: number; locale: string };

// Rates are vs USD (mock fallback — live rates come from the exchange_rates table).
export const CURRENCIES: Meta[] = [
  { code: "USD", symbol: "$",  label: "US Dollar",        rate: 1,    locale: "en-US" },
  { code: "JMD", symbol: "J$", label: "Jamaican Dollar",  rate: 157,  locale: "en-JM" },
];

type Ctx = {
  currency: Meta;
  setCurrency: (code: CurrencyCode) => void;
  format: (amountUSD: number, options?: { decimals?: number; compact?: boolean }) => string;
  symbol: string;
};

const CurrencyContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "tradehub.currency";

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState<CurrencyCode>("USD");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) as CurrencyCode | null;
    if (stored && CURRENCIES.some((c) => c.code === stored)) setCode(stored);
  }, []);

  const setCurrency = (next: CurrencyCode) => {
    setCode(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  };

  const currency = CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];

  const format: Ctx["format"] = (amountUSD, options = {}) => {
    const converted = amountUSD * currency.rate;
    const decimals = options.decimals ?? 2;
    try {
      return new Intl.NumberFormat(currency.locale, {
        style: "currency",
        currency: currency.code,
        notation: options.compact ? "compact" : "standard",
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
      }).format(converted);
    } catch {
      return `${currency.symbol}${Math.round(converted).toLocaleString()}`;
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, format, symbol: currency.symbol }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
  return ctx;
}

export function CurrencySelect({ className }: { className?: string }) {
  const { currency, setCurrency } = useCurrency();
  return (
    <Select value={currency.code} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
      <SelectTrigger className={`h-9 w-[110px] ${className ?? ""}`} aria-label="Select currency">
        <SelectValue>
          <span className="font-medium">{currency.symbol} {currency.code}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {CURRENCIES.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            <span className="font-medium mr-2">{c.symbol}</span>
            {c.code}
            <span className="text-muted-foreground text-xs ml-2">{c.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
