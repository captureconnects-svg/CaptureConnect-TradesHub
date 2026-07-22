import { supabase } from "@/lib/supabase";
import { notify } from "@/backend/notify";
import {
  buildVerificationApprovedEmail,
  buildVerificationRejectedEmail,
  buildTestimonialApprovedEmail,
  buildTestimonialRejectedEmail,
  buildSuspensionEmail,
  buildReinstatementEmail,
  buildAccountDeletedEmail,
  buildRefundInitiatedEmail,
  sendNotificationEmail,
} from "@/backend/notification-emails";
import { buildPayoutReceiptEmail } from "@/backend/email-templates";
import type { BankDetails } from "@/backend/pro-banking";
import type { PayoutReceipt } from "@/lib/payments/types";

const ALLOWED_ROLES = ["admin", "super_admin"] as const;
type AdminRole = (typeof ALLOWED_ROLES)[number];

function assertValidUUID(id: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Invalid ID format.");
  }
}

export async function adminLogin(
  email: string,
  password: string,
): Promise<{ ok: boolean; adminId: string | null }> {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (authError || !authData.user) return { ok: false, adminId: null };

  // Verify the signed-in user has an admin or super_admin record
  const { data: adminRecord, error: adminError } = await supabase
    .from("admin")
    .select("id, name, role")
    .eq("email", email)
    .in("role", ALLOWED_ROLES)
    .maybeSingle();

  if (adminError || !adminRecord) {
    await supabase.auth.signOut();
    return { ok: false, adminId: null };
  }

  localStorage.setItem("tradehub-admin-email", email);
  localStorage.setItem("tradehub-admin-name", String(adminRecord.name ?? email));
  localStorage.setItem("tradehub-admin-role", String(adminRecord.role));
  return { ok: true, adminId: authData.user.id };
}

/** Async server-side auth check — replaces the old localStorage flag. */
export async function checkAdminAuth(): Promise<boolean> {
  try {
    await requireAdminRole();
    return true;
  } catch {
    return false;
  }
}

/** Clears admin display state from localStorage (cosmetic only — not auth). */
export function setAdminAuthenticated(value: boolean) {
  if (!value) {
    localStorage.removeItem("tradehub-admin-email");
    localStorage.removeItem("tradehub-admin-name");
    localStorage.removeItem("tradehub-admin-role");
  }
}

/** Signs the admin out from Supabase and clears local display state. */
export async function adminSignOut(): Promise<void> {
  setAdminAuthenticated(false);
  await supabase.auth.signOut();
}

export function setAdminEmail(email: string) {
  localStorage.setItem("tradehub-admin-email", email);
}

export function getAdminEmail(): string | null {
  try {
    return localStorage.getItem("tradehub-admin-email");
  } catch {
    return null;
  }
}

export function getAdminName(): string | null {
  try {
    return localStorage.getItem("tradehub-admin-name");
  } catch {
    return null;
  }
}

export function getAdminRole(): AdminRole | null {
  try {
    const role = localStorage.getItem("tradehub-admin-role");
    return ALLOWED_ROLES.includes(role as AdminRole) ? (role as AdminRole) : null;
  } catch {
    return null;
  }
}

export async function updateAdminPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const email = session?.user?.email;
  if (!email) throw new Error("No active session. Please log in again.");

  const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (verifyError) throw new Error("Current password is incorrect.");

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) throw new Error("Failed to update password. Please try again.");
}

/** Throws if the current Supabase session does not belong to an admin or super_admin. */
export async function requireAdminRole(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.email) throw new Error("Unauthorized: no active session");

  const { data: adminRecord } = await supabase
    .from("admin")
    .select("role")
    .eq("email", session.user.email)
    .in("role", ALLOWED_ROLES)
    .maybeSingle();

  if (!adminRecord) throw new Error("Unauthorized: admin or super_admin role required");
}

async function logAdminAction(
  action: string,
  targetType: string,
  details: Record<string, unknown>,
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const adminName = session?.user?.email ?? "admin";
    await supabase.from("audit_logs").insert({
      admin_id: session?.user?.id ?? null,
      admin_name: adminName,
      action,
      target_type: targetType,
      details: JSON.stringify(details),
    });
  } catch {
    // never block the primary action due to a logging failure
  }
}

export async function fetchAdminOverviewStats() {
  await requireAdminRole();
  const [
    { count: clientCount },
    { count: proCount },
    { count: bookingCount },
    { count: reviewCount },
    { count: orderCount },
    { count: convoCount },
    { count: verificationCount },
    { count: testimonialCount },
    { count: merchandiseCount },
    { count: likesCount },
  ] = await Promise.all([
    supabase.from("client_profiles").select("*", { count: "exact", head: true }),
    supabase.from("tradesperson_profiles").select("*", { count: "exact", head: true }),
    supabase.from("client_bookings").select("*", { count: "exact", head: true }),
    supabase.from("client_reviews").select("*", { count: "exact", head: true }),
    supabase.from("client_shopping").select("*", { count: "exact", head: true }),
    supabase.from("conversations").select("*", { count: "exact", head: true }),
    supabase.from("verification_request").select("*", { count: "exact", head: true }),
    supabase.from("landing_testimonials").select("*", { count: "exact", head: true }),
    supabase.from("tradesperson_SellersSpecialty").select("*", { count: "exact", head: true }),
    supabase.from("client_likes").select("*", { count: "exact", head: true }),
  ]);

  return {
    clientCount: clientCount ?? 0,
    proCount: proCount ?? 0,
    bookingCount: bookingCount ?? 0,
    reviewCount: reviewCount ?? 0,
    orderCount: orderCount ?? 0,
    convoCount: convoCount ?? 0,
    verificationCount: verificationCount ?? 0,
    testimonialCount: testimonialCount ?? 0,
    merchandiseCount: merchandiseCount ?? 0,
    likesCount: likesCount ?? 0,
  };
}

export async function fetchAllClients() {
  await requireAdminRole();
  const { data, error } = await supabase
    .from("client_profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchAllTradespeople() {
  await requireAdminRole();
  const { data, error } = await supabase
    .from("tradesperson_profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchAllBookings() {
  await requireAdminRole();
  const { data, error } = await supabase
    .from("client_bookings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type AdminBooking = {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  tradespersonId: string;
  tradespersonName: string;
  service: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  notes: string;
  packagePrice: number;
  tip: number;
  totalPrice: number;
  status: string;
  paymentStatus: string | null;
  serviceLink: string | null;
  refunded: boolean;
  createdAt: string;
  updatedAt: string | null;
  returnRequestId: number | null;
  returnRequestStatus: string | null;
  returnRefundType: string | null;
  returnPartialAmount: number | null;
};

export async function fetchAdminBookings(): Promise<AdminBooking[]> {
  await requireAdminRole();
  const { data: bookings, error } = await supabase
    .from("client_bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!bookings || bookings.length === 0) return [];

  const clientIds = [...new Set(bookings.map((b) => b.client_id as string).filter(Boolean))];
  const traderIds = [...new Set(bookings.map((b) => b.tradesperson_id as string).filter(Boolean))];

  const [{ data: clients }, { data: traders }] = await Promise.all([
    clientIds.length > 0
      ? supabase.from("client_profiles").select("id, full_name, username, email").in("id", clientIds)
      : Promise.resolve({ data: [] as any[] }),
    traderIds.length > 0
      ? supabase.from("tradesperson_profiles").select("id, full_name, username").in("id", traderIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const clientMap: Record<string, { name: string; email: string }> = {};
  for (const c of clients ?? []) {
    clientMap[c.id as string] = {
      name: String(c.username ?? c.full_name ?? "Unknown"),
      email: String(c.email ?? ""),
    };
  }

  const traderMap: Record<string, string> = {};
  for (const t of traders ?? []) {
    traderMap[t.id as string] = String(t.username ?? t.full_name ?? "Unknown");
  }

  const bookingIds = bookings.map((b) => b.id as string);
  let bookingReturnRequests: any[] = [];
  if (bookingIds.length > 0) {
    const { data: rrData } = await supabase
      .from("return_request")
      .select("id, booking_id, status, refund_type, partial_amount")
      .in("booking_id", bookingIds);
    bookingReturnRequests = rrData ?? [];
  }

  const returnByBooking: Record<string, { id: number; status: string; refundType: string | null; partialAmount: number | null }> = {};
  for (const rr of bookingReturnRequests) {
    const bid = rr.booking_id as string;
    if (!returnByBooking[bid]) {
      returnByBooking[bid] = {
        id: rr.id as number,
        status: rr.status as string,
        refundType: (rr.refund_type as string) ?? null,
        partialAmount: (rr.partial_amount as number) ?? null,
      };
    }
  }

  return bookings.map((b) => {
    const clientId = b.client_id as string;
    const traderId = b.tradesperson_id as string;
    const clientInfo = clientMap[clientId] ?? {
      name: String(b.full_name ?? "Unknown"),
      email: String(b.email ?? ""),
    };
    const rr = returnByBooking[b.id as string] ?? null;
    return {
      id: b.id as string,
      clientId,
      clientName: clientInfo.name,
      clientEmail: clientInfo.email || String(b.email ?? ""),
      clientPhone: String(b.phone ?? ""),
      tradespersonId: traderId,
      tradespersonName: traderMap[traderId] ?? "Unknown",
      service: String(b.service ?? ""),
      date: String(b.request_date ?? ""),
      time: String(b.request_time ?? ""),
      duration: Number(b.duration ?? 0),
      location: String(b.location ?? ""),
      notes: String(b.notes ?? ""),
      packagePrice: Number(b.package_price ?? 0),
      tip: Number(b.tips_optional ?? 0),
      totalPrice: Number(b.total_price ?? 0),
      status: String(b.booking_status ?? "pending"),
      paymentStatus: (b.payment_status as string) ?? null,
      serviceLink: (b.service_link as string) ?? null,
      refunded: Boolean(b.refunded ?? false),
      createdAt: String(b.created_at ?? ""),
      updatedAt: (b.updated_at as string) ?? null,
      returnRequestId: rr?.id ?? null,
      returnRequestStatus: rr?.status ?? null,
      returnRefundType: rr?.refundType ?? null,
      returnPartialAmount: rr?.partialAmount ?? null,
    };
  });
}

export async function deleteAdminBooking(id: string): Promise<void> {
  await requireAdminRole();
  const { error } = await supabase.from("client_bookings").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logAdminAction("delete_booking", "booking", { bookingId: id });
}

export async function updateAdminBookingStatus(id: string, status: string): Promise<void> {
  await requireAdminRole();
  const { error } = await supabase
    .from("client_bookings")
    .update({ booking_status: status })
    .eq("id", id);
  if (error) throw new Error(error.message);
  const action = status === "refunded" ? "refund_booking" : "update_booking_status";
  await logAdminAction(action, "booking", { bookingId: id, status });
}

export async function issueBookingRefund(id: string): Promise<void> {
  await requireAdminRole();
  const { error } = await supabase
    .from("client_bookings")
    .update({ refunded: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await supabase
    .from("return_request")
    .update({ status: "refunded" })
    .eq("booking_id", id)
    .eq("status", "pro_approved");
  await logAdminAction("issue_booking_refund", "booking", { bookingId: id });

  // Notify client (fire-and-forget)
  ;(async () => {
    const { data: booking } = await supabase
      .from("client_bookings")
      .select("client_id, email, full_name, service, total_price")
      .eq("id", id)
      .maybeSingle();
    if (!booking?.email || !booking?.client_id) return;
    const clientName = String(booking.full_name ?? "there");
    const amount = `$${Number(booking.total_price).toFixed(2)}`;
    await notify({
      userId: booking.client_id as string,
      userEmail: booking.email as string,
      title: "Refund initiated",
      message: `A refund of ${amount} for your booking has been initiated.`,
      type: "payment",
      emailHtml: buildRefundInitiatedEmail(clientName, amount, booking.service as string),
      emailSubject: "Refund initiated — Capture Connect",
    });
  })().catch(() => {});
}

export async function fetchAllReviews() {
  await requireAdminRole();
  const { data, error } = await supabase
    .from("client_reviews")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type AdminReview = {
  id: number;
  clientId: string;
  clientName: string;
  tradespersonId: string;
  tradespersonName: string;
  rating: number;
  title: string;
  description: string;
  createdAt: string;
};

export async function fetchAdminReviews(): Promise<AdminReview[]> {
  await requireAdminRole();
  const { data, error } = await supabase
    .from("client_reviews")
    .select("id, client_id, tradesperson_id, review_rating, review_title, review_descript, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  const clientIds = [...new Set(data.map((r) => r.client_id as string).filter(Boolean))];
  const traderIds = [...new Set(data.map((r) => r.tradesperson_id as string).filter(Boolean))];

  const [{ data: clients }, { data: traders }] = await Promise.all([
    clientIds.length > 0
      ? supabase.from("client_profiles").select("id, full_name, username").in("id", clientIds)
      : Promise.resolve({ data: [] as any[] }),
    traderIds.length > 0
      ? supabase.from("tradesperson_profiles").select("id, full_name, username").in("id", traderIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const clientMap: Record<string, string> = {};
  for (const c of clients ?? []) {
    clientMap[c.id as string] = String(c.username ?? c.full_name ?? "Client");
  }

  const traderMap: Record<string, string> = {};
  for (const t of traders ?? []) {
    traderMap[t.id as string] = String(t.username ?? t.full_name ?? "Unknown");
  }

  return data.map((r) => ({
    id: r.id as number,
    clientId: r.client_id as string,
    clientName: clientMap[r.client_id as string] ?? "Client",
    tradespersonId: r.tradesperson_id as string,
    tradespersonName: traderMap[r.tradesperson_id as string] ?? "Unknown",
    rating: Number(r.review_rating ?? 0),
    title: String(r.review_title ?? ""),
    description: String(r.review_descript ?? ""),
    createdAt: String(r.created_at ?? ""),
  }));
}

export async function deleteAdminReview(id: number): Promise<void> {
  await requireAdminRole();
  const { error } = await supabase.from("client_reviews").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logAdminAction("delete_review", "review", { reviewId: id });
}

export type AdminOrderItem = {
  id: number;
  serviceName: string;
  productPrice: number;
  quantity: number;
  productSize: string | null;
  imageUrl: string | null;
};

export type AdminOrder = {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  shippingMethod: string;
  shippingAddress: string | null;
  subTotal: number;
  shippingTotal: number;
  tax: number;
  totalPrice: number;
  isDelivered: boolean | null;
  refunded: boolean;
  createdAt: string;
  items: AdminOrderItem[];
  returnRequestId: number | null;
  returnRequestStatus: string | null;
  returnRefundType: string | null;
  returnPartialAmount: number | null;
};

export async function fetchAdminOrders(): Promise<AdminOrder[]> {
  await requireAdminRole();
  const { data: orders, error } = await supabase
    .from("client_shopping")
    .select("id, full_name, email, phone, shipping_method, shipping_address, sub_total, shipping_total, tax, total_price, isDelivered, refunded, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!orders || orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id as number);

  const { data: rawItems } = await supabase
    .from("client_shopping.ITEMS")
    .select("id, shopping_id, img, item_id, product_size, product_price, quantity")
    .in("shopping_id", orderIds);

  const typedItems = (rawItems ?? []) as Array<{
    id: number; shopping_id: number;
    img: number | null; item_id: number | null;
    product_size: string | null; product_price: unknown; quantity: unknown;
  }>;

  // Build a map from image row id → public URL (primary path: item.img)
  const imageByItem: Record<number, string> = {};

  const directImgIds = typedItems
    .map((i) => i.img)
    .filter((id): id is number => id !== null);

  if (directImgIds.length > 0) {
    const { data: imgRows } = await supabase
      .from("tradesperson_Sell.Spe.images")
      .select("id, product_imgURL")
      .in("id", directImgIds);
    const urlById: Record<number, string> = {};
    for (const row of imgRows ?? []) {
      if (row.product_imgURL) urlById[row.id as number] = row.product_imgURL as string;
    }
    for (const item of typedItems) {
      if (item.img && urlById[item.img]) imageByItem[item.id] = urlById[item.img];
    }
  }

  // Fallback path for items where img is null: item_id → variant.product_id → images by product_id
  const noImageItems = typedItems.filter((i) => !imageByItem[i.id] && i.item_id !== null);
  if (noImageItems.length > 0) {
    const variantIds = [...new Set(noImageItems.map((i) => i.item_id as number))];
    const { data: variants } = await supabase
      .from("tradesperson_Sell.Spe.variant")
      .select("id, product_id")
      .in("id", variantIds);

    const productIdByVariant: Record<number, number> = {};
    for (const v of variants ?? []) {
      productIdByVariant[v.id as number] = v.product_id as number;
    }

    const productIds = [...new Set(Object.values(productIdByVariant))];
    if (productIds.length > 0) {
      const { data: productImgs } = await supabase
        .from("tradesperson_Sell.Spe.images")
        .select("product_id, product_imgURL")
        .in("product_id", productIds);

      // Keep only the first image per product
      const urlByProductId: Record<number, string> = {};
      for (const row of productImgs ?? []) {
        const pid = row.product_id as number;
        if (!urlByProductId[pid] && row.product_imgURL) {
          urlByProductId[pid] = row.product_imgURL as string;
        }
      }

      for (const item of noImageItems) {
        const productId = productIdByVariant[item.item_id as number];
        if (productId && urlByProductId[productId]) {
          imageByItem[item.id] = urlByProductId[productId];
        }
      }
    }
  }

  const itemsByOrder: Record<number, AdminOrderItem[]> = {};
  for (const item of typedItems) {
    const sid = item.shopping_id;
    if (!itemsByOrder[sid]) itemsByOrder[sid] = [];
    itemsByOrder[sid].push({
      id: item.id,
      serviceName: item.product_size ?? "Item",
      productPrice: Number(item.product_price ?? 0),
      quantity: Number(item.quantity ?? 1),
      productSize: item.product_size ?? null,
      imageUrl: imageByItem[item.id] ?? null,
    });
  }

  const { data: orderReturnRequests } = await supabase
    .from("return_request")
    .select("id, order_id, status, refund_type, partial_amount")
    .in("order_id", orderIds);

  const returnByOrder: Record<number, { id: number; status: string; refundType: string | null; partialAmount: number | null }> = {};
  for (const rr of orderReturnRequests ?? []) {
    const oid = rr.order_id as number;
    if (!returnByOrder[oid]) {
      returnByOrder[oid] = {
        id: rr.id as number,
        status: rr.status as string,
        refundType: (rr.refund_type as string) ?? null,
        partialAmount: (rr.partial_amount as number) ?? null,
      };
    }
  }

  return orders.map((o) => {
    const rr = returnByOrder[o.id as number] ?? null;
    return {
      id: o.id as number,
      fullName: String(o.full_name ?? "Unknown"),
      email: String(o.email ?? ""),
      phone: String(o.phone ?? ""),
      shippingMethod: String(o.shipping_method ?? "pickup"),
      shippingAddress: (o.shipping_address as string) ?? null,
      subTotal: Number(o.sub_total ?? 0),
      shippingTotal: Number(o.shipping_total ?? 0),
      tax: Number(o.tax ?? 0),
      totalPrice: Number(o.total_price ?? 0),
      isDelivered: (o.isDelivered as boolean) ?? null,
      refunded: Boolean(o.refunded ?? false),
      createdAt: String(o.created_at ?? ""),
      items: itemsByOrder[o.id as number] ?? [],
      returnRequestId: rr?.id ?? null,
      returnRequestStatus: rr?.status ?? null,
      returnRefundType: rr?.refundType ?? null,
      returnPartialAmount: rr?.partialAmount ?? null,
    };
  });
}

export async function deleteAdminOrder(id: number): Promise<void> {
  await requireAdminRole();
  const { error } = await supabase.from("client_shopping").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logAdminAction("delete_order", "order", { orderId: id });
}

export async function issueOrderRefund(orderId: number): Promise<void> {
  await requireAdminRole();
  const { error } = await supabase
    .from("client_shopping")
    .update({ refunded: true })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
  await supabase
    .from("return_request")
    .update({ status: "refunded" })
    .eq("order_id", orderId)
    .eq("status", "pro_approved");
  await logAdminAction("issue_order_refund", "order", { orderId });

  // Notify client (fire-and-forget)
  ;(async () => {
    const { data: order } = await supabase
      .from("client_shopping")
      .select("client_id, email, full_name, total_price")
      .eq("id", orderId)
      .maybeSingle();
    if (!order?.email || !order?.client_id) return;
    const clientName = String(order.full_name ?? "there");
    const amount = `$${Number(order.total_price).toFixed(2)}`;
    await notify({
      userId: order.client_id as string,
      userEmail: order.email as string,
      title: "Refund initiated",
      message: `A refund of ${amount} for your order has been initiated.`,
      type: "payment",
      emailHtml: buildRefundInitiatedEmail(clientName, amount, "your order"),
      emailSubject: "Refund initiated — Capture Connect",
    });
  })().catch(() => {});
}

export async function fetchAllOrders() {
  await requireAdminRole();
  const { data, error } = await supabase
    .from("client_shopping")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchAllConversations() {
  await requireAdminRole();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchAllMerchandise() {
  await requireAdminRole();
  const { data, error } = await supabase
    .from("tradesperson_SellersSpecialty")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchAllVerifications() {
  await requireAdminRole();
  const { data, error } = await supabase
    .from("verification_request")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchAllTestimonials() {
  await requireAdminRole();
  const { data, error } = await supabase
    .from("landing_testimonials")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Admin Testimonials ────────────────────────────────────────────────────────

export type AdminTestimonial = {
  id: number;
  userId: string;
  submitterName: string;
  displayName: string;
  userType: string;
  description: string;
  videoUrl: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

export async function fetchAdminTestimonials(): Promise<AdminTestimonial[]> {
  await requireAdminRole();
  const { data, error } = await supabase
    .from("landing_testimonials")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  const userIds = [...new Set(data.map((r) => r.user_id as string).filter(Boolean))];
  const [{ data: clients }, { data: pros }] = await Promise.all([
    userIds.length > 0
      ? supabase.from("client_profiles").select("id, full_name, username").in("id", userIds)
      : Promise.resolve({ data: [] as any[] }),
    userIds.length > 0
      ? supabase.from("tradesperson_profiles").select("id, full_name, username").in("id", userIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const profileMap: Record<string, string> = {};
  for (const p of [...(clients ?? []), ...(pros ?? [])]) {
    profileMap[p.id as string] = String(p.username ?? p.full_name ?? "Unknown");
  }

  return data.map((r) => ({
    id: r.id as number,
    userId: r.user_id as string,
    submitterName: profileMap[r.user_id as string] ?? "Unknown",
    displayName: String(r.name ?? ""),
    userType: String(r.userType ?? ""),
    description: String(r.description ?? ""),
    videoUrl: String(r.video_URL ?? ""),
    status: (r.status ?? "pending") as "pending" | "approved" | "rejected",
    createdAt: r.created_at as string,
  }));
}

export async function updateTestimonialStatus(
  id: number,
  status: "approved" | "rejected",
): Promise<void> {
  await requireAdminRole();
  const { error } = await supabase
    .from("landing_testimonials")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
  const action = status === "approved" ? "approved_testimonial" : "reject_testimonial";
  await logAdminAction(action, "testimonial", { testimonialId: id, status });

  // Notify the submitter (fire-and-forget)
  ;(async () => {
    const { data: testimonial } = await supabase
      .from("landing_testimonials")
      .select("user_id, userType, name")
      .eq("id", id)
      .maybeSingle();
    if (!testimonial?.user_id) return;

    const userId = testimonial.user_id as string;
    const displayName = String((testimonial as any).name ?? "there");
    const userType = String((testimonial as any).userType ?? "client");

    const table = userType === "tradesperson" ? "tradesperson_profiles" : "client_profiles";
    const { data: profile } = await supabase
      .from(table)
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    if (!(profile as any)?.email) return;

    const userEmail = (profile as any).email as string;
    if (status === "approved") {
      await notify({
        userId,
        userEmail,
        title: "Testimonial approved",
        message: "Your testimonial has been approved and is now live on the platform.",
        type: "admin",
        emailHtml: buildTestimonialApprovedEmail(displayName),
        emailSubject: "Testimonial approved — Capture Connect",
      });
    } else {
      await notify({
        userId,
        userEmail,
        title: "Testimonial not approved",
        message: "Your testimonial could not be approved at this time.",
        type: "admin",
        emailHtml: buildTestimonialRejectedEmail(displayName),
        emailSubject: "Testimonial not approved — Capture Connect",
      });
    }
  })().catch(() => {});
}

// ─── Admin Verifications ───────────────────────────────────────────────────────

export type AdminVerification = {
  id: number;
  userId: string;
  tradespersonName: string;
  status: "pending" | "approved" | "rejected";
  reason: string | null;
  createdAt: string;
};

export async function fetchAdminVerifications(): Promise<AdminVerification[]> {
  await requireAdminRole();
  const { data, error } = await supabase
    .from("verification_request")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  const userIds = [...new Set(data.map((r) => r.user_id as string).filter(Boolean))];
  const { data: profiles } = userIds.length > 0
    ? await supabase.from("tradesperson_profiles").select("id, full_name, username").in("id", userIds)
    : { data: [] as any[] };

  const profileMap: Record<string, string> = {};
  for (const p of profiles ?? []) {
    profileMap[p.id as string] = String(p.username ?? p.full_name ?? "Unknown");
  }

  return data.map((r) => ({
    id: r.id as number,
    userId: r.user_id as string,
    tradespersonName: profileMap[r.user_id as string] ?? "Unknown",
    status: (r.status ?? "pending") as "pending" | "approved" | "rejected",
    reason: (r.reason as string) ?? null,
    createdAt: r.created_at as string,
  }));
}

export type VerificationDocument = {
  fileType: string;
  filePath: string;
  url: string;
};

export async function fetchVerificationDocuments(requestId: number): Promise<VerificationDocument[]> {
  await requireAdminRole();
  const { data, error } = await supabase
    .from("verification_documents")
    .select("file_type, file_path")
    .eq("request_id", requestId);

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  const ONE_DAY = 60 * 60 * 24;
  const results = await Promise.all(
    data.map(async (doc) => {
      const { data: urlData } = await supabase.storage
        .from("verification_documents")
        .createSignedUrl(doc.file_path as string, ONE_DAY);
      return {
        fileType: doc.file_type as string,
        filePath: doc.file_path as string,
        url: urlData?.signedUrl ?? "",
      };
    }),
  );
  return results;
}

export async function updateVerificationStatus(
  id: number,
  status: "approved" | "rejected",
  reason?: string,
): Promise<void> {
  await requireAdminRole();
  const updates: Record<string, unknown> = { status };
  if (reason !== undefined) updates.reason = reason;
  const { error } = await supabase
    .from("verification_request")
    .update(updates)
    .eq("id", id);
  if (error) throw new Error(error.message);
  const action = status === "approved" ? "approve_verification" : "reject_verification";
  await logAdminAction(action, "verification", { verificationId: id, status, reason });

  // Notify the tradesperson (fire-and-forget)
  ;(async () => {
    const { data: request } = await supabase
      .from("verification_request")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();
    if (!request?.user_id) return;

    const { data: profile } = await supabase
      .from("tradesperson_profiles")
      .select("full_name, username, email")
      .eq("id", request.user_id as string)
      .maybeSingle();
    if (!(profile as any)?.email) return;

    const displayName = String(
      (profile as any).username ?? (profile as any).full_name ?? "there"
    );
    const userEmail = (profile as any).email as string;

    if (status === "approved") {
      await notify({
        userId: request.user_id as string,
        userEmail,
        title: "Verification approved",
        message: "Congratulations! Your account has been verified.",
        type: "verification",
        link: "/pro-dashboard",
        emailHtml: buildVerificationApprovedEmail(displayName),
        emailSubject: "Verification approved — Capture Connect",
      });
    } else {
      await notify({
        userId: request.user_id as string,
        userEmail,
        title: "Verification rejected",
        message: reason ?? "Your verification was not approved. Please resubmit with the correct documents.",
        type: "verification",
        link: "/pro-dashboard",
        emailHtml: buildVerificationRejectedEmail(
          displayName,
          reason ?? "Please contact support for more details."
        ),
        emailSubject: "Verification rejected — Capture Connect",
      });
    }
  })().catch(() => {});
}

const ALLOWED_VERIFICATION_FIELDS = new Set(["status", "reason", "notes"]);

export async function editVerification(
  id: number,
  updates: Record<string, unknown>,
): Promise<void> {
  await requireAdminRole();
  const safeUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (ALLOWED_VERIFICATION_FIELDS.has(key)) safeUpdates[key] = value;
  }
  if (Object.keys(safeUpdates).length === 0) return;
  const { error } = await supabase
    .from("verification_request")
    .update(safeUpdates)
    .eq("id", id);
  if (error) throw new Error(error.message);
  await logAdminAction("edit_verification", "verification", { verificationId: id, ...safeUpdates });
}

export async function fetchAllLikes() {
  await requireAdminRole();
  const { data, error } = await supabase
    .from("client_likes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Unified user management ──────────────────────────────────────────────────

export type AdminUser = {
  id: string;
  fullName: string;
  username: string;
  email: string;
  type: "Client" | "Pro";
  status: "Active" | "Deactivated" | "Suspended" | "Deleted";
  joinDate: string;
  dob?: string;
  location?: string;
  profileImage?: string;
  yearsOfExperience?: number;
  specialties?: string[];
};

function toAdminStatus(raw: string | null): AdminUser["status"] {
  switch ((raw ?? "").toLowerCase()) {
    case "suspended": return "Suspended";
    case "deactivated": return "Deactivated";
    case "deleted": return "Deleted";
    default: return "Active";
  }
}

export async function fetchAllUsers(): Promise<AdminUser[]> {
  await requireAdminRole();
  const [
    { data: clients, error: clientsError },
    { data: pros, error: prosError },
    { data: deleted },
  ] = await Promise.all([
    supabase
      .from("client_profiles")
      .select("id, full_name, username, email, account_status, created_at, date_of_birth, location, profile_image")
      .order("created_at", { ascending: false }),
    supabase
      .from("tradesperson_profiles")
      .select("id, full_name, username, email, account_status, created_at, date_of_birth, location, profile_image, years_of_experience")
      .order("created_at", { ascending: false }),
    supabase
      .from("deleted_accounts")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  if (clientsError) throw new Error(clientsError.message);
  if (prosError) throw new Error(prosError.message);

  const proIds = (pros ?? []).map((p) => p.id as string);

  const { data: specialtyRows } = proIds.length
    ? await supabase.from("tradesperson_specialty").select("tradesperson_id, specialty").in("tradesperson_id", proIds)
    : { data: [] as { tradesperson_id: string; specialty: string }[] };

  const specialtyMap: Record<string, string[]> = {};
  for (const row of specialtyRows ?? []) {
    const pid = row.tradesperson_id as string;
    if (!specialtyMap[pid]) specialtyMap[pid] = [];
    if (!specialtyMap[pid].includes(row.specialty as string)) {
      specialtyMap[pid].push(row.specialty as string);
    }
  }

  const clientUsers: AdminUser[] = (clients ?? []).map((c) => ({
    id: c.id as string,
    fullName: String(c.full_name ?? c.username ?? "Unknown"),
    username: String(c.username ?? ""),
    email: String(c.email ?? ""),
    type: "Client",
    status: toAdminStatus(c.account_status as string | null),
    joinDate: c.created_at as string,
    dob: (c.date_of_birth as string) || undefined,
    location: (c.location as string) || undefined,
    profileImage: (c.profile_image as string) || undefined,
  }));

  const proUsers: AdminUser[] = (pros ?? []).map((p) => ({
    id: p.id as string,
    fullName: String(p.full_name ?? p.username ?? "Unknown"),
    username: String(p.username ?? ""),
    email: String(p.email ?? ""),
    type: "Pro",
    status: toAdminStatus(p.account_status as string | null),
    joinDate: p.created_at as string,
    dob: (p.date_of_birth as string) || undefined,
    location: (p.location as string) || undefined,
    profileImage: (p.profile_image as string) || undefined,
    yearsOfExperience: p.years_of_experience != null ? Number(p.years_of_experience) : undefined,
    specialties: specialtyMap[p.id as string] ?? [],
  }));

  // Collect IDs already represented in live profiles so deleted records don't duplicate
  const liveIds = new Set([...clientUsers, ...proUsers].map((u) => u.id));

  const deletedUsers: AdminUser[] = (deleted ?? [])
    .filter((d) => !liveIds.has(d.user_id as string))
    .map((d) => ({
      id: d.user_id as string,
      fullName: String(d.full_name ?? d.username ?? "Deleted User"),
      username: String(d.username ?? ""),
      email: String(d.email ?? ""),
      type: (d.user_type as string) === "tradesperson" ? "Pro" : "Client",
      status: "Deleted" as const,
      joinDate: String(d.joined_at ?? d.created_at ?? ""),
    }));

  return [...clientUsers, ...proUsers, ...deletedUsers].sort(
    (a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime(),
  );
}

export async function updateAdminUser(
  id: string,
  type: "Client" | "Pro",
  data: { fullName?: string; username?: string; email?: string },
): Promise<void> {
  await requireAdminRole();
  const table = type === "Client" ? "client_profiles" : "tradesperson_profiles";
  const updates: Record<string, string> = {};
  if (data.fullName !== undefined) updates.full_name = data.fullName;
  if (data.username !== undefined) updates.username = data.username;
  if (data.email !== undefined) updates.email = data.email;
  if (Object.keys(updates).length === 0) return;
  const { error } = await supabase.from(table).update(updates).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function toggleUserSuspension(
  userId: string,
  suspend: boolean,
  type: "Client" | "Pro",
): Promise<void> {
  await requireAdminRole();
  const table = type === "Client" ? "client_profiles" : "tradesperson_profiles";
  const { error } = await supabase
    .from(table)
    .update({ account_status: suspend ? "suspended" : "active" })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  const action = suspend ? "suspend_user" : "reactivate_user";
  await logAdminAction(action, "user", { userId, userType: type });

  // Email the user (fire-and-forget)
  ;(async () => {
    const { data: profile } = await supabase
      .from(table)
      .select("full_name, username, email")
      .eq("id", userId)
      .maybeSingle();
    if (!(profile as any)?.email) return;
    const displayName = String((profile as any).username ?? (profile as any).full_name ?? "there");
    const userEmail = (profile as any).email as string;
    if (suspend) {
      await sendNotificationEmail({
        to: userEmail,
        subject: "Your account has been suspended — Capture Connect",
        html: buildSuspensionEmail(displayName, "Please contact our support team for further information."),
      });
    } else {
      await sendNotificationEmail({
        to: userEmail,
        subject: "Your account has been reinstated — Capture Connect",
        html: buildReinstatementEmail(displayName),
      });
    }
  })().catch(() => {});
}

export async function createAdminUser(data: {
  fullName: string;
  email: string;
  password: string;
  type: "Client" | "Pro";
}): Promise<void> {
  await requireAdminRole();
  // Preserve any existing session so we can restore it after signup auto-signs in the new user
  const { data: { session: previousSession } } = await supabase.auth.getSession();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: { data: { full_name: data.fullName } },
  });

  if (authError) throw new Error(authError.message);

  const userId = authData.user?.id;
  if (!userId) throw new Error("Failed to create auth user");

  const table =
    data.type === "Client" ? "client_profiles" : "tradesperson_profiles";

  const { error: profileError } = await supabase
    .from(table)
    .upsert(
      { id: userId, full_name: data.fullName, email: data.email, account_status: "active" },
      { onConflict: "id" },
    );

  if (profileError) throw new Error(profileError.message);

  await supabase.auth.signOut();

  if (previousSession) {
    await supabase.auth.setSession({
      access_token: previousSession.access_token,
      refresh_token: previousSession.refresh_token,
    });
  }

  await logAdminAction("create_new_user", "user", { email: data.email, userType: data.type });
}

export async function deleteAdminUser(
  id: string,
  type: "Client" | "Pro",
): Promise<void> {
  await requireAdminRole();
  assertValidUUID(id);

  // Fetch profile info before deleting so we can write the tombstone record
  const [{ data: clientProfile }, { data: proProfile }] = await Promise.all([
    supabase.from("client_profiles").select("username, full_name, email, role, created_at").eq("id", id).maybeSingle(),
    supabase.from("tradesperson_profiles").select("username, full_name, email, role, created_at").eq("id", id).maybeSingle(),
  ]);
  const profile = clientProfile ?? proProfile;

  // Insert tombstone into deleted_accounts before wiping data
  const { error: tombstoneError } = await supabase.from("deleted_accounts").insert({
    user_id: id,
    username: profile?.username ?? null,
    full_name: profile?.full_name ?? null,
    email: profile?.email ?? null,
    role: profile?.role ?? null,
    user_type: type === "Client" ? "client" : "tradesperson",
    deleted_by: "admin",
    joined_at: profile?.created_at ?? null,
  });
  if (tombstoneError) throw new Error(`Failed to record deletion: ${tombstoneError.message}`);

  // Fetch child record IDs so we can cascade-delete in tables that need it
  const [{ data: convos }, { data: products }] = await Promise.all([
    supabase.from("conversations").select("id").or(`client_id.eq.${id},tradesperson_id.eq.${id}`),
    supabase.from("tradesperson_SellersSpecialty").select("id").eq("tradesperson_id", id),
  ]);

  // Delete grandchild rows first
  const childDeletes: PromiseLike<unknown>[] = [];
  if (convos?.length) {
    const ids = convos.map((r) => r.id as number);
    childDeletes.push(supabase.from("conversations_msg").delete().in("convo_id", ids));
  }
  if (products?.length) {
    const ids = products.map((r) => r.id as string);
    childDeletes.push(supabase.from("tradesperson_Sell.Spe.variant").delete().in("product_id", ids));
    childDeletes.push(supabase.from("tradesperson_Sell.Spe.images").delete().in("product_id", ids));
  }
  if (childDeletes.length) await Promise.all(childDeletes);

  // Delete all parent-level user data
  await Promise.all([
    supabase.from("conversations").delete().or(`client_id.eq.${id},tradesperson_id.eq.${id}`),
    supabase.from("client_likes").delete().or(`client_id.eq.${id},tradesperson_id.eq.${id}`),
    supabase.from("client_reviews").delete().or(`client_id.eq.${id},tradesperson_id.eq.${id}`),
    supabase.from("client_activity").delete().or(`client_id.eq.${id},tradesperson_id.eq.${id}`),
    supabase.from("tradesperson_SellersSpecialty").delete().eq("tradesperson_id", id),
    supabase.from("tradesperson_WorkDays").delete().eq("tradesperson_id", id),
    supabase.from("tradesperson_FAQ").delete().eq("tradesperson_id", id),
    supabase.from("tradesperson_certification").delete().eq("tradesperson_id", id),
    supabase.from("tradesperson_packages").delete().eq("tradesperson_id", id),
    supabase.from("tradesperson_addOns").delete().eq("tradesperson_id", id),
    supabase.from("tradesperson_specialty").delete().eq("tradesperson_id", id),
    supabase.from("tradesperson_discountCode").delete().eq("tradesperson_id", id),
    supabase.from("client_profiles").delete().eq("id", id),
    supabase.from("tradesperson_profiles").delete().eq("id", id),
  ]);

  await logAdminAction("delete_user", "user", { userId: id, userType: type });

  // Email the user before their data is gone — profile was fetched above
  if (profile?.email) {
    const displayName = String(profile.username ?? profile.full_name ?? "there");
    sendNotificationEmail({
      to: profile.email as string,
      subject: "Your account has been deleted — Capture Connect",
      html: buildAccountDeletedEmail(displayName, type.toLowerCase()),
    }).catch(() => {});
  }
}

// ─── Overview panel data ───────────────────────────────────────────────────────

export type AdminActivityItem = {
  id: number;
  activityType: string;
  description: string;
  tradespersonName: string;
  createdAt: string;
};

export async function fetchAdminRecentActivity(limit = 20): Promise<AdminActivityItem[]> {
  await requireAdminRole();
  const { data } = await supabase
    .from("client_activity")
    .select("id, tradesperson_id, activity_type, description, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data || data.length === 0) return [];

  const traderIds = [...new Set(data.map((r) => r.tradesperson_id as string))];
  const { data: profiles } = await supabase
    .from("tradesperson_profiles")
    .select("id, username, full_name")
    .in("id", traderIds);

  const profileMap: Record<string, string> = {};
  for (const p of profiles ?? []) {
    profileMap[p.id as string] = String(p.username ?? p.full_name ?? "Unknown");
  }

  return data.map((r) => ({
    id: r.id as number,
    activityType: r.activity_type as string,
    description: r.description as string,
    tradespersonName: profileMap[r.tradesperson_id as string] ?? "Unknown",
    createdAt: r.created_at as string,
  }));
}

export type AdminQuickStats = {
  activeBookings: number;
  bookingsToday: number;
  newTradespeople: number;
  newClients: number;
};

export async function fetchAdminQuickStats(): Promise<AdminQuickStats> {
  await requireAdminRole();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: activeBookings },
    { count: bookingsToday },
    { count: newTradespeople },
    { count: newClients },
  ] = await Promise.all([
    supabase
      .from("client_bookings")
      .select("*", { count: "exact", head: true })
      .in("booking_status", ["pending", "confirmed"]),
    supabase
      .from("client_bookings")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayIso),
    supabase
      .from("tradesperson_profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo),
    supabase
      .from("client_profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo),
  ]);

  return {
    activeBookings: activeBookings ?? 0,
    bookingsToday: bookingsToday ?? 0,
    newTradespeople: newTradespeople ?? 0,
    newClients: newClients ?? 0,
  };
}

export type AdminTopPro = {
  id: string;
  name: string;
  username: string;
  bookingCount: number;
  reviewCount: number;
  avgRating: number;
};

export async function fetchAdminTopTradespeople(limit = 5): Promise<AdminTopPro[]> {
  await requireAdminRole();
  const [{ data: bookings }, { data: reviews }, { data: profiles }] = await Promise.all([
    supabase.from("client_bookings").select("tradesperson_id"),
    supabase.from("client_reviews").select("tradesperson_id, review_rating"),
    supabase.from("tradesperson_profiles").select("id, username, full_name"),
  ]);

  const bookingCounts: Record<string, number> = {};
  for (const b of bookings ?? []) {
    const id = b.tradesperson_id as string;
    bookingCounts[id] = (bookingCounts[id] ?? 0) + 1;
  }

  const reviewCounts: Record<string, number> = {};
  const ratingSum: Record<string, number> = {};
  for (const r of reviews ?? []) {
    const id = r.tradesperson_id as string;
    reviewCounts[id] = (reviewCounts[id] ?? 0) + 1;
    ratingSum[id] = (ratingSum[id] ?? 0) + Number(r.review_rating ?? 0);
  }

  const profileMap: Record<string, { name: string; username: string }> = {};
  for (const p of profiles ?? []) {
    profileMap[p.id as string] = {
      name: String(p.username ?? p.full_name ?? "Unknown"),
      username: String(p.username ?? ""),
    };
  }

  const topIds = Object.entries(bookingCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  return topIds.map((id) => ({
    id,
    name: profileMap[id]?.name ?? "Unknown",
    username: profileMap[id]?.username ?? "",
    bookingCount: bookingCounts[id] ?? 0,
    reviewCount: reviewCounts[id] ?? 0,
    avgRating: reviewCounts[id]
      ? Math.round((ratingSum[id] / reviewCounts[id]) * 10) / 10
      : 0,
  }));
}

export type AdminLoyalClient = {
  id: string;
  name: string;
  username: string;
  bookingCount: number;
};

export async function fetchAdminLoyalClients(limit = 5): Promise<AdminLoyalClient[]> {
  await requireAdminRole();
  const [{ data: bookings }, { data: profiles }] = await Promise.all([
    supabase.from("client_bookings").select("client_id"),
    supabase.from("client_profiles").select("id, username, full_name, email"),
  ]);

  const bookingCounts: Record<string, number> = {};
  for (const b of bookings ?? []) {
    const id = b.client_id as string;
    bookingCounts[id] = (bookingCounts[id] ?? 0) + 1;
  }

  const profileMap: Record<string, { name: string; username: string }> = {};
  for (const p of profiles ?? []) {
    profileMap[p.id as string] = {
      name: String(p.username ?? p.full_name ?? p.email ?? "Unknown"),
      username: String(p.username ?? p.email ?? ""),
    };
  }

  const topIds = Object.entries(bookingCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  return topIds.map((id) => ({
    id,
    name: profileMap[id]?.name ?? "Unknown",
    username: profileMap[id]?.username ?? "",
    bookingCount: bookingCounts[id] ?? 0,
  }));
}

// ─── Audit Logs ────────────────────────────────────────────────────────────────

export type AuditLogEntry = {
  id: number;
  adminId: string | null;
  adminName: string;
  action: string;
  targetType: string;
  details: string;
  createdAt: string;
};

export async function fetchAuditLogs(limit = 500): Promise<AuditLogEntry[]> {
  await requireAdminRole();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, admin_id, admin_name, action, target_type, details, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({
    id: r.id as number,
    adminId: (r.admin_id as string) ?? null,
    adminName: String(r.admin_name ?? ""),
    action: String(r.action ?? ""),
    targetType: String(r.target_type ?? ""),
    details: String(r.details ?? ""),
    createdAt: r.created_at as string,
  }));
}

// ─── Security Metrics ─────────────────────────────────────────────────────────

export type SecurityMetrics = {
  suspendedClients: number;
  suspendedPros: number;
  pendingVerifications: number;
  rejectedVerifications: number;
  recentSignups7d: number;
};

export async function fetchSecurityMetrics(): Promise<SecurityMetrics> {
  await requireAdminRole();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: suspendedClients },
    { count: suspendedPros },
    { count: pendingVerifications },
    { count: rejectedVerifications },
    { count: clientSignups },
    { count: proSignups },
  ] = await Promise.all([
    supabase.from("client_profiles").select("*", { count: "exact", head: true }).eq("account_status", "suspended"),
    supabase.from("tradesperson_profiles").select("*", { count: "exact", head: true }).eq("account_status", "suspended"),
    supabase.from("verification_request").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("verification_request").select("*", { count: "exact", head: true }).eq("status", "rejected"),
    supabase.from("client_profiles").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    supabase.from("tradesperson_profiles").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
  ]);

  return {
    suspendedClients: suspendedClients ?? 0,
    suspendedPros: suspendedPros ?? 0,
    pendingVerifications: pendingVerifications ?? 0,
    rejectedVerifications: rejectedVerifications ?? 0,
    recentSignups7d: (clientSignups ?? 0) + (proSignups ?? 0),
  };
}

export async function fetchSuspendedUsers(): Promise<AdminUser[]> {
  await requireAdminRole();
  const [{ data: clients }, { data: pros }] = await Promise.all([
    supabase.from("client_profiles").select("*").eq("account_status", "suspended").order("created_at", { ascending: false }),
    supabase.from("tradesperson_profiles").select("*").eq("account_status", "suspended").order("created_at", { ascending: false }),
  ]);

  const clientUsers: AdminUser[] = (clients ?? []).map((c) => ({
    id: c.id as string,
    fullName: String(c.full_name ?? c.username ?? "Unknown"),
    username: String(c.username ?? ""),
    email: String(c.email ?? ""),
    type: "Client" as const,
    status: "Suspended" as const,
    joinDate: c.created_at as string,
    dob: (c.date_of_birth as string) || undefined,
    location: (c.location as string) || undefined,
    profileImage: (c.profile_image as string) || undefined,
  }));

  const proUsers: AdminUser[] = (pros ?? []).map((p) => ({
    id: p.id as string,
    fullName: String(p.full_name ?? p.username ?? "Unknown"),
    username: String(p.username ?? ""),
    email: String(p.email ?? ""),
    type: "Pro" as const,
    status: "Suspended" as const,
    joinDate: p.created_at as string,
    dob: (p.date_of_birth as string) || undefined,
    location: (p.location as string) || undefined,
    profileImage: (p.profile_image as string) || undefined,
    yearsOfExperience: p.years_of_experience != null ? Number(p.years_of_experience) : undefined,
  }));

  return [...clientUsers, ...proUsers];
}

// ─── Admin Settings (localStorage) ────────────────────────────────────────────

export type AdminSettings = {
  siteName: string;
  maintenanceMode: boolean;
  allowRegistrations: boolean;
  sessionTimeoutHours: number;
  defaultCurrency: string;
  auditLogRetentionDays: number;
};

const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  siteName: "Capture Connect - TradeHub Marketplace",
  maintenanceMode: false,
  allowRegistrations: true,
  sessionTimeoutHours: 24,
  defaultCurrency: "USD",
  auditLogRetentionDays: 90,
};

export async function getAdminSettings(): Promise<AdminSettings> {
  try {
    const { data } = await supabase
      .from("admin_settings")
      .select("site_name, maintenance_mode, allow_registrations, session_timeout_hours, default_currency, audit_log_retention_days")
      .eq("id", 1)
      .maybeSingle();
    if (!data) return { ...DEFAULT_ADMIN_SETTINGS };
    return {
      siteName: String(data.site_name ?? DEFAULT_ADMIN_SETTINGS.siteName),
      maintenanceMode: Boolean(data.maintenance_mode ?? DEFAULT_ADMIN_SETTINGS.maintenanceMode),
      allowRegistrations: Boolean(data.allow_registrations ?? DEFAULT_ADMIN_SETTINGS.allowRegistrations),
      sessionTimeoutHours: Number(data.session_timeout_hours ?? DEFAULT_ADMIN_SETTINGS.sessionTimeoutHours),
      defaultCurrency: String(data.default_currency ?? DEFAULT_ADMIN_SETTINGS.defaultCurrency),
      auditLogRetentionDays: Number(data.audit_log_retention_days ?? DEFAULT_ADMIN_SETTINGS.auditLogRetentionDays),
    };
  } catch {
    return { ...DEFAULT_ADMIN_SETTINGS };
  }
}

async function purgeOldAuditLogs(retentionDays: number): Promise<void> {
  if (retentionDays <= 0) return;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("audit_logs").delete().lt("created_at", cutoff);
}

export async function saveAdminSettings(settings: AdminSettings): Promise<void> {
  await requireAdminRole();
  const { error } = await supabase
    .from("admin_settings")
    .upsert({
      id: 1,
      site_name: settings.siteName,
      maintenance_mode: settings.maintenanceMode,
      allow_registrations: settings.allowRegistrations,
      session_timeout_hours: settings.sessionTimeoutHours,
      default_currency: settings.defaultCurrency,
      audit_log_retention_days: settings.auditLogRetentionDays,
      updated_at: new Date().toISOString(),
    });
  if (error) {
    console.error("[admin] saveAdminSettings:", error.message);
    throw new Error("Failed to save settings. Please try again.");
  }
  await purgeOldAuditLogs(settings.auditLogRetentionDays);
  await logAdminAction("change_platform_settings", "settings", { settings });
}

// ─── Admin Login History (localStorage) ───────────────────────────────────────

export type AdminLoginRecord = {
  at: string;
  name: string | null;
  email: string;
  adminId: string | null;
  ip: string | null;
};

export async function recordAdminLogin(
  email: string,
  adminId: string | null,
  ip: string | null,
  name: string | null = null,
): Promise<void> {
  try {
    await supabase.from("audit_logs").insert({
      admin_id: adminId,
      admin_name: name ?? email,
      action: "admin_login",
      target_type: "session",
      details: JSON.stringify({ email, ip }),
    });
  } catch {}
}

export async function getAdminLoginHistory(): Promise<AdminLoginRecord[]> {
  try {
    const { data } = await supabase
      .from("audit_logs")
      .select("admin_id, admin_name, created_at, details")
      .eq("action", "admin_login")
      .order("created_at", { ascending: false })
      .limit(20);
    return (data ?? []).map((r) => {
      let details: Record<string, unknown> = {};
      try { details = JSON.parse((r.details as string) ?? "{}"); } catch {}
      return {
        at: r.created_at as string,
        name: (r.admin_name as string) ?? null,
        email: (details.email as string) ?? "",
        adminId: (r.admin_id as string) ?? null,
        ip: (details.ip as string) ?? null,
      };
    });
  } catch {
    return [];
  }
}

// ─── Payout Management ─────────────────────────────────────────────────────────

export async function approvePayoutRequest(
  payoutId: number | string,
  recipientName?: string,
): Promise<void> {
  await requireAdminRole();
  await logAdminAction("approved_payout_request", "payout", { payoutId, recipientName });
}

export async function rejectPayoutRequest(
  payoutId: number | string,
  reason?: string,
  recipientName?: string,
): Promise<void> {
  await requireAdminRole();
  await logAdminAction("reject_payout_request", "payout", { payoutId, reason, recipientName });
}

export async function markPayoutPaid(
  payoutId: number | string,
  amount?: number,
  recipientName?: string,
): Promise<void> {
  await requireAdminRole();
  await logAdminAction("mark_payout_paid", "payout", { payoutId, amount, recipientName });
}

// ─── Payout Receipts (Stripe Connect manual-transfer confirmation) ────────────

export type AdminProBankDetails = BankDetails | null;

/** Admin-only: a specific pro's banking/transfer details — RLS ("Admins can view all banking details") scopes this. */
export async function fetchAdminProBankDetails(proId: string): Promise<AdminProBankDetails> {
  await requireAdminRole();
  const { data, error } = await supabase
    .from("tradesperson_banking_details")
    .select("full_name, name_of_bank, bank_branch, account_type, account_number, home_address, phone, country, currency")
    .eq("tradesperson_id", proId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    fullName: String(data.full_name ?? ""),
    nameOfBank: String(data.name_of_bank ?? ""),
    bankBranch: String(data.bank_branch ?? ""),
    accountType: String(data.account_type ?? ""),
    accountNumber: data.account_number != null ? String(data.account_number) : "",
    homeAddress: String(data.home_address ?? ""),
    phone: String(data.phone ?? ""),
    country: String(data.country ?? ""),
    currency: String(data.currency ?? ""),
  };
}

/** Admin-only: pre-allocates a receipt/payout number pair before the payout_receipts row exists (see next_payout_receipt_numbers() in payout_receipts_extend.sql) — needed because the generated PDF must print the numbers before it's uploaded. */
export async function allocatePayoutReceiptNumbers(): Promise<{ receiptNumber: string; payoutNumber: string }> {
  await requireAdminRole();
  const { data, error } = await supabase.rpc("next_payout_receipt_numbers");
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.receipt_number || !row?.payout_number) {
    throw new Error("Failed to allocate receipt numbers.");
  }
  return { receiptNumber: row.receipt_number as string, payoutNumber: row.payout_number as string };
}

const PAYOUT_RECEIPT_ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

async function uploadPayoutReceiptFile(bucket: string, proId: string, file: File | Blob, fileName?: string): Promise<string> {
  const type = "type" in file ? file.type : "application/pdf";
  const ext = PAYOUT_RECEIPT_ALLOWED_TYPES[type] ?? (type === "application/pdf" ? "pdf" : null);
  if (!ext) throw new Error("Unsupported file type. Allowed: JPEG, PNG, WebP, or PDF.");
  const path = `${proId}/${fileName ?? Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: type || "application/octet-stream" });
  if (error) throw new Error(error.message || "File upload failed");
  return path;
}

/**
 * Admin-only: marks a pro's escrow-cleared payments as paid out via manual
 * transfer, generates the official TradeHub payout receipt, uploads both the
 * admin's raw proof-of-transfer and the generated PDF, records the
 * payout_receipts row, and emails the pro their receipt. The payments
 * themselves must already have been released — see releaseManualPayout() —
 * this only records the transfer confirmation and receipt.
 */
export async function confirmPayoutTransfer(params: {
  proId: string;
  proEmail: string;
  proName: string;
  amount: number;
  currency: string;
  paymentIds: string[];
  receiptNumber: string;
  payoutNumber: string;
  transferMethod: string;
  transferReference: string;
  transferDate: string;
  expectedDelivery: string;
  adminNotes: string;
  adminOriginalFile: File;
  receiptPdfBlob: Blob;
}): Promise<void> {
  await requireAdminRole();

  const { data: { session } } = await supabase.auth.getSession();
  const uploadedBy = session?.user?.id ?? null;

  const [adminReceiptPath, generatedReceiptPath] = await Promise.all([
    uploadPayoutReceiptFile("payout_admin_receipts", params.proId, params.adminOriginalFile),
    uploadPayoutReceiptFile("payout_receipts", params.proId, params.receiptPdfBlob, `${Date.now()}-receipt`),
  ]);

  const { error } = await supabase.from("payout_receipts").insert({
    tradesperson_id: params.proId,
    uploaded_by: uploadedBy,
    amount: params.amount,
    currency: params.currency,
    status: "Completed",
    receipt_number: params.receiptNumber,
    payout_number: params.payoutNumber,
    transfer_method: params.transferMethod,
    transfer_reference: params.transferReference || null,
    transfer_date: params.transferDate,
    expected_delivery: params.expectedDelivery || null,
    admin_notes: params.adminNotes || null,
    file_path: generatedReceiptPath,
    admin_receipt_records: adminReceiptPath,
    is_generated_receipt: true,
    payment_ids: params.paymentIds,
  });
  if (error) throw new Error(error.message);

  await logAdminAction("confirm_payout_transfer", "payout", {
    proId: params.proId,
    amount: params.amount,
    receiptNumber: params.receiptNumber,
    payoutNumber: params.payoutNumber,
    paymentIds: params.paymentIds,
  });

  const formattedAmount = new Intl.NumberFormat("en-US", { style: "currency", currency: params.currency }).format(params.amount);
  await notify({
    userId: params.proId,
    userEmail: params.proEmail,
    title: "Your payout has been sent",
    message: `${formattedAmount} has been transferred to you — receipt ${params.receiptNumber}.`,
    type: "payment",
    emailHtml: buildPayoutReceiptEmail(
      params.proName,
      formattedAmount,
      params.transferMethod,
      params.transferReference,
      params.transferDate,
      params.receiptNumber,
    ),
    emailSubject: "Your payout has been sent — Capture Connect",
  }).catch(() => {});
}

export interface PayoutReceiptAdminRecord extends PayoutReceipt {
  /** Signed URL (1 hour) into the admin-only payout_admin_receipts bucket — null if missing or signing failed. */
  adminReceiptUrl: string | null;
  /** Signed URL (1 hour) into the payout_receipts bucket for the generated PDF — null if missing or signing failed. */
  generatedReceiptUrl: string | null;
}

/** Admin-only: all payout receipts recorded for a specific pro, newest first, with signed URLs for both files. */
export async function fetchAdminPayoutReceipts(proId: string): Promise<PayoutReceiptAdminRecord[]> {
  await requireAdminRole();
  const { data, error } = await supabase
    .from("payout_receipts")
    .select("*")
    .eq("tradesperson_id", proId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as PayoutReceipt[];
  return Promise.all(
    rows.map(async (r) => {
      let adminReceiptUrl: string | null = null;
      if (r.admin_receipt_records) {
        const { data: signed } = await supabase.storage
          .from("payout_admin_receipts")
          .createSignedUrl(r.admin_receipt_records, 3600);
        adminReceiptUrl = signed?.signedUrl ?? null;
      }

      let generatedReceiptUrl: string | null = null;
      if (r.is_generated_receipt && r.file_path) {
        const { data: signed } = await supabase.storage
          .from("payout_receipts")
          .createSignedUrl(r.file_path, 3600);
        generatedReceiptUrl = signed?.signedUrl ?? null;
      }

      return { ...r, adminReceiptUrl, generatedReceiptUrl };
    }),
  );
}
