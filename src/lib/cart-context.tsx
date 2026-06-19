import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type CartItem = {
  id: string;
  traderId: string;
  traderName: string;
  traderInitials: string;
  serviceName: string;
  price: number;
  quantity: number;
  variantId: number | null;
  imgId: number | null;
  imageUrl: string | null;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  itemCount: number;
  total: number;
};

const CartContext = createContext<CartContextType | null>(null);

function persistCart(items: CartItem[]): CartItem[] {
  try {
    localStorage.setItem("tradehub-cart", JSON.stringify(items));
  } catch {}
  return items;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem("tradehub-cart");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const addItem = useCallback((item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      return persistCart(
        existing
          ? prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))
          : [...prev, { ...item, quantity: 1 }]
      );
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => persistCart(prev.filter((i) => i.id !== id)));
  }, []);

  const updateQuantity = useCallback((id: string, qty: number) => {
    setItems((prev) =>
      persistCart(
        qty <= 0
          ? prev.filter((i) => i.id !== id)
          : prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i))
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    try {
      localStorage.removeItem("tradehub-cart");
    } catch {}
  }, []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, itemCount, total }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
