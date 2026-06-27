import { supabase } from "@/lib/supabase";
import type { CartItem } from "@/lib/cart-context";
import { logActivity } from "@/backend/pro-activity";

export type OrderItem = {
  id: number;
  itemId: number | null;
  serviceName: string;
  productPrice: number;
  quantity: number;
  imageUrl: string | null;
};

export type OrderRecord = {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  shippingMethod: string;
  shippingAddress: string;
  subTotal: number;
  shippingTotal: number;
  tax: number;
  totalPrice: number;
  createdAt: string;
  items: OrderItem[];
  tradespersonId: string;
};

async function resolveItemImages(
  items: Array<{ id: number; img: number | null }>
): Promise<Record<number, string>> {
  const imgIds = items
    .map((i) => i.img)
    .filter((id): id is number => id !== null);

  if (imgIds.length === 0) return {};

  const { data: images } = await supabase
    .from("tradesperson_Sell.Spe.images")
    .select("id, product_imgURL")
    .in("id", imgIds);

  const urlById: Record<number, string> = {};
  for (const row of images ?? []) {
    urlById[row.id as number] = row.product_imgURL as string;
  }

  const imageByItem: Record<number, string> = {};
  for (const item of items) {
    if (item.img && urlById[item.img]) {
      imageByItem[item.id] = urlById[item.img];
    }
  }

  return imageByItem;
}

export async function submitShoppingOrder(params: {
  tradespersonId: string;
  fullName: string;
  email: string;
  phone: string;
  shippingMethod: "pickup" | "delivery";
  shippingAddress: string;
  subTotal: number;
  shippingTotal: number;
  tax: number;
  totalPrice: number;
  cartItems: CartItem[];
}): Promise<number> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Not authenticated");

  const { data: order, error: orderError } = await supabase
    .from("client_shopping")
    .insert({
      client_id: authData.user.id,
      tradesperson_id: params.tradespersonId || authData.user.id,
      full_name: params.fullName,
      email: params.email,
      phone: params.phone,
      shipping_method: params.shippingMethod,
      shipping_address: params.shippingAddress || null,
      sub_total: params.subTotal,
      shipping_total: params.shippingTotal,
      tax: params.tax,
      total_price: params.totalPrice,
    })
    .select("id")
    .single();

  if (orderError) throw orderError;

  const shoppingId = order.id as number;

  if (params.cartItems.length > 0) {
    const { error: itemsError } = await supabase
      .from("client_shopping.ITEMS")
      .insert(
        params.cartItems.map((item) => ({
          shopping_id: shoppingId,
          item_id: (item.variantId ?? null),
          img: (item.imgId ?? null),
          product_size: item.serviceName,
          product_price: item.price,
          quantity: item.quantity,
        })),
      );
    if (itemsError) throw itemsError;
  }

  logActivity({
    tradespersonId: params.tradespersonId || authData.user.id,
    activityType: "order",
    description: `${params.fullName} placed a shopping order`,
    clientId: authData.user.id,
  }).catch(() => {});

  return shoppingId;
}

export async function fetchClientOrders(): Promise<OrderRecord[]> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return [];

  const { data: orders, error } = await supabase
    .from("client_shopping")
    .select(
      "id, tradesperson_id, full_name, email, phone, shipping_method, shipping_address, sub_total, shipping_total, tax, total_price, created_at",
    )
    .eq("client_id", authData.user.id)
    .order("created_at", { ascending: false });

  if (error || !orders || orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id as number);

  const { data: items } = await supabase
    .from("client_shopping.ITEMS")
    .select("id, shopping_id, item_id, img, product_size, product_price, quantity")
    .in("shopping_id", orderIds);

  const rawItems = (items ?? []) as Array<{
    id: number; shopping_id: number; item_id: number | null; img: number | null;
    product_size: string; product_price: unknown; quantity: unknown;
  }>;

  const imageByItem = await resolveItemImages(rawItems);

  const itemsByOrder: Record<number, OrderItem[]> = {};
  for (const item of rawItems) {
    const sid = item.shopping_id;
    if (!itemsByOrder[sid]) itemsByOrder[sid] = [];
    itemsByOrder[sid].push({
      id: item.id,
      itemId: item.item_id ?? null,
      serviceName: item.product_size ?? "Item",
      productPrice: Number(item.product_price ?? 0),
      quantity: Number(item.quantity ?? 1),
      imageUrl: imageByItem[item.id] ?? null,
    });
  }

  return orders.map((o) => ({
    id: o.id as number,
    tradespersonId: (o.tradesperson_id as string) ?? "",
    fullName: (o.full_name as string) ?? "",
    email: (o.email as string) ?? "",
    phone: (o.phone as string) ?? "",
    shippingMethod: (o.shipping_method as string) ?? "pickup",
    shippingAddress: (o.shipping_address as string) ?? "",
    subTotal: Number(o.sub_total ?? 0),
    shippingTotal: Number(o.shipping_total ?? 0),
    tax: Number(o.tax ?? 0),
    totalPrice: Number(o.total_price ?? 0),
    createdAt: (o.created_at as string) ?? "",
    items: itemsByOrder[o.id as number] ?? [],
  }));
}

export type ProOrderRecord = {
  id: number;
  clientName: string;
  email: string;
  phone: string;
  shippingMethod: string;
  shippingAddress: string;
  subTotal: number;
  shippingTotal: number;
  tax: number;
  totalPrice: number;
  createdAt: string;
  isDelivered: boolean | null;
  items: OrderItem[];
};

export async function fetchProOrders(): Promise<ProOrderRecord[]> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return [];

  const { data: orders, error } = await supabase
    .from("client_shopping")
    .select(
      "id, full_name, email, phone, shipping_method, shipping_address, sub_total, shipping_total, tax, total_price, created_at, isDelivered",
    )
    .eq("tradesperson_id", authData.user.id)
    .order("created_at", { ascending: false });

  if (error || !orders || orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id as number);

  const { data: items } = await supabase
    .from("client_shopping.ITEMS")
    .select("id, shopping_id, item_id, img, product_size, product_price, quantity")
    .in("shopping_id", orderIds);

  const rawItems = (items ?? []) as Array<{
    id: number; shopping_id: number; item_id: number | null; img: number | null;
    product_size: string; product_price: unknown; quantity: unknown;
  }>;

  const imageByItem = await resolveItemImages(rawItems);

  const itemsByOrder: Record<number, OrderItem[]> = {};
  for (const item of rawItems) {
    const sid = item.shopping_id;
    if (!itemsByOrder[sid]) itemsByOrder[sid] = [];
    itemsByOrder[sid].push({
      id: item.id,
      itemId: item.item_id ?? null,
      serviceName: item.product_size ?? "Item",
      productPrice: Number(item.product_price ?? 0),
      quantity: Number(item.quantity ?? 1),
      imageUrl: imageByItem[item.id] ?? null,
    });
  }

  return orders.map((o) => ({
    id: o.id as number,
    clientName: (o.full_name as string) ?? "",
    email: (o.email as string) ?? "",
    phone: (o.phone as string) ?? "",
    shippingMethod: (o.shipping_method as string) ?? "pickup",
    shippingAddress: (o.shipping_address as string) ?? "",
    subTotal: Number(o.sub_total ?? 0),
    shippingTotal: Number(o.shipping_total ?? 0),
    tax: Number(o.tax ?? 0),
    totalPrice: Number(o.total_price ?? 0),
    createdAt: (o.created_at as string) ?? "",
    isDelivered: (o.isDelivered as boolean | null) ?? null,
    items: itemsByOrder[o.id as number] ?? [],
  }));
}

export async function updateOrderFulfillment(orderId: number): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("client_shopping")
    .update({ isDelivered: true })
    .eq("id", orderId)
    .eq("tradesperson_id", authData.user.id);
  if (error) throw error;
}
