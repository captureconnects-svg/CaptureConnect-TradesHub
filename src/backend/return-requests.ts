import { supabase } from "@/lib/supabase";
import { logActivity } from "@/backend/pro-activity";
import { requireAdminRole } from "@/backend/admin";
import {
  sendAdminAlertEmail,
  buildAdminRefundRequestAlertEmail,
  buildRefundInitiatedEmail,
  buildRefundDeniedEmail,
  buildRefundCompletedEmail,
} from "@/backend/notification-emails";
import { notify } from "@/backend/notify";

export type ReturnRequestStatus = "pending" | "pro_approved" | "pro_declined" | "refunded";

export type ReturnRequest = {
  id: number;
  orderId: number | null;
  bookingId: string | null;
  clientId: string;
  tradespersonId: string;
  reason: string;
  status: ReturnRequestStatus;
  refundType: "full" | "partial" | null;
  partialAmount: number | null;
  createdAt: string;
};

function mapRequest(r: Record<string, unknown>): ReturnRequest {
  return {
    id: r.id as number,
    orderId: (r.order_id as number | null) ?? null,
    bookingId: (r.booking_id as string | null) ?? null,
    clientId: r.client_id as string,
    tradespersonId: r.tradesperson_id as string,
    reason: (r.reason as string) ?? "",
    status: (r.status as ReturnRequestStatus) ?? "pending",
    refundType: (r.refund_type as "full" | "partial" | null) ?? null,
    partialAmount: (r.partial_amount as number | null) ?? null,
    createdAt: r.created_at as string,
  };
}

export async function submitReturnRequest(params: {
  orderId?: number;
  bookingId?: string;
  tradespersonId: string;
  reason: string;
}): Promise<number> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("return_request")
    .insert({
      order_id: params.orderId ?? null,
      booking_id: params.bookingId ?? null,
      client_id: authData.user.id,
      tradesperson_id: params.tradespersonId,
      reason: params.reason,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  const requestId = data.id as number;

  (async () => {
    const { data: cp } = await supabase
      .from("client_profiles")
      .select("full_name, username")
      .eq("id", authData.user!.id)
      .single();
    const clientName =
      (cp?.username as string | null)?.trim() ||
      (cp?.full_name as string | null)?.trim() ||
      "A client";
    const context = params.bookingId ? "booking" : "order";
    await logActivity({
      tradespersonId: params.tradespersonId,
      activityType: "refund_request",
      description: `${clientName} submitted a refund request for a ${context}`,
      clientId: authData.user!.id,
    });

    // Notify admin
    let service = context === "booking" ? "a booking" : "an order";
    let amount = "";
    if (params.bookingId) {
      const { data: booking } = await supabase
        .from("client_bookings")
        .select("service, total_price")
        .eq("id", params.bookingId)
        .maybeSingle();
      if (booking) {
        service = (booking.service as string) || service;
        amount = `$${Number(booking.total_price).toFixed(2)}`;
      }
    } else if (params.orderId) {
      const { data: order } = await supabase
        .from("client_shopping")
        .select("total_price")
        .eq("id", params.orderId)
        .maybeSingle();
      if (order) amount = `$${Number(order.total_price).toFixed(2)}`;
    }
    await sendAdminAlertEmail(
      "New refund request — Capture Connect",
      buildAdminRefundRequestAlertEmail(clientName, authData.user!.email ?? "", amount, service),
    );
  })().catch(() => {});

  return requestId;
}

const ALLOWED_EVIDENCE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);
const MAX_EVIDENCE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function uploadReturnEvidence(file: File, requestId: number): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Not authenticated");

  if (!ALLOWED_EVIDENCE_TYPES.has(file.type))
    throw new Error("Invalid file type. Allowed: JPEG, PNG, WebP, GIF, PDF.");
  if (file.size > MAX_EVIDENCE_SIZE)
    throw new Error("File too large. Maximum size is 10 MB.");

  const MIME_TO_EXT: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
    "image/gif": "gif", "application/pdf": "pdf",
  };
  const ext = MIME_TO_EXT[file.type] ?? "bin";
  const path = `${authData.user.id}/${requestId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("return_evidence")
    .upload(path, file);
  if (uploadError) throw new Error(uploadError.message);

  const { error: dbError } = await supabase
    .from("return_requestEvidence")
    .insert({ request_id: requestId, file_url: path });
  if (dbError) throw new Error(dbError.message);
}

export async function fetchClientReturnRequests(): Promise<ReturnRequest[]> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return [];

  const { data, error } = await supabase
    .from("return_request")
    .select("*")
    .eq("client_id", authData.user.id)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []).map(mapRequest);
}

export async function fetchProReturnRequests(): Promise<ReturnRequest[]> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return [];

  const { data, error } = await supabase
    .from("return_request")
    .select("*")
    .eq("tradesperson_id", authData.user.id)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []).map(mapRequest);
}

export async function approveReturnRequest(
  id: number,
  refundType: "full" | "partial",
  partialAmount?: number,
): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("return_request")
    .update({
      status: "pro_approved",
      refund_type: refundType,
      partial_amount: refundType === "partial" ? (partialAmount ?? null) : null,
    })
    .eq("id", id)
    .eq("tradesperson_id", authData.user.id);

  if (error) throw new Error(error.message);

  // Notify client that their refund request has been approved (fire-and-forget)
  ;(async () => {
    const { data: req } = await supabase
      .from("return_request")
      .select("client_id, booking_id, order_id, partial_amount, refund_type")
      .eq("id", id)
      .maybeSingle();
    if (!req?.client_id) return;

    const { data: cp } = await supabase
      .from("client_profiles")
      .select("full_name, username, email")
      .eq("id", req.client_id as string)
      .maybeSingle();
    if (!(cp as any)?.email) return;

    const clientName = String((cp as any).username ?? (cp as any).full_name ?? "there");
    const isPartial = req.refund_type === "partial";
    const amount = isPartial && req.partial_amount
      ? `$${Number(req.partial_amount).toFixed(2)} (partial)`
      : "your payment";
    const context = req.booking_id ? "booking" : "order";

    await notify({
      userId: req.client_id as string,
      userEmail: (cp as any).email as string,
      title: "Refund initiated",
      message: `Your refund request for your ${context} has been approved.`,
      type: "payment",
      emailHtml: buildRefundInitiatedEmail(clientName, amount, context),
      emailSubject: "Refund initiated — Capture Connect",
    });
  })().catch(() => {});
}

export async function declineReturnRequest(id: number): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("return_request")
    .update({ status: "pro_declined" })
    .eq("id", id)
    .eq("tradesperson_id", authData.user.id);

  if (error) throw new Error(error.message);

  // Notify client that their refund was denied (fire-and-forget)
  ;(async () => {
    const { data: req } = await supabase
      .from("return_request")
      .select("client_id, booking_id, reason")
      .eq("id", id)
      .maybeSingle();
    if (!req?.client_id) return;

    const { data: cp } = await supabase
      .from("client_profiles")
      .select("full_name, username, email")
      .eq("id", req.client_id as string)
      .maybeSingle();
    if (!(cp as any)?.email) return;

    const clientName = String((cp as any).username ?? (cp as any).full_name ?? "there");
    const context = req.booking_id ? "booking" : "order";

    await notify({
      userId: req.client_id as string,
      userEmail: (cp as any).email as string,
      title: "Refund request declined",
      message: `Your refund request for your ${context} was declined.`,
      type: "payment",
      emailHtml: buildRefundDeniedEmail(clientName, context, "The service provider reviewed and declined your request."),
      emailSubject: "Refund request declined — Capture Connect",
    });
  })().catch(() => {});
}

export async function fetchReturnEvidence(requestId: number): Promise<string[]> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return [];

  // Verify caller is the client, the pro, or an admin for this request
  const { data: request } = await supabase
    .from("return_request")
    .select("client_id, tradesperson_id")
    .eq("id", requestId)
    .maybeSingle();

  if (!request) return [];
  const uid = authData.user.id;
  const isOwner = request.client_id === uid || request.tradesperson_id === uid;
  if (!isOwner) {
    const { data: adminRecord } = await supabase
      .from("admin")
      .select("role")
      .eq("email", authData.user.email ?? "")
      .in("role", ["admin", "super_admin"])
      .maybeSingle();
    if (!adminRecord) return [];
  }

  const { data, error } = await supabase
    .from("return_requestEvidence")
    .select("file_url")
    .eq("request_id", requestId);

  if (error || !data || data.length === 0) return [];

  const urls: string[] = [];
  for (const row of data) {
    const { data: signedData, error: signError } = await supabase.storage
      .from("return_evidence")
      .createSignedUrl(row.file_url as string, 3600);
    if (signError) {
      console.error("return_evidence sign error:", signError.message, row.file_url);
      continue;
    }
    if (signedData?.signedUrl) urls.push(signedData.signedUrl);
  }
  return urls;
}

export async function markReturnRefunded(id: number): Promise<void> {
  await requireAdminRole();
  const { error } = await supabase
    .from("return_request")
    .update({ status: "refunded" })
    .eq("id", id);
  if (error) throw new Error(error.message);

  // Notify client that their refund is complete (fire-and-forget)
  ;(async () => {
    const { data: req } = await supabase
      .from("return_request")
      .select("client_id, partial_amount, refund_type")
      .eq("id", id)
      .maybeSingle();
    if (!req?.client_id) return;

    const { data: cp } = await supabase
      .from("client_profiles")
      .select("full_name, username, email")
      .eq("id", req.client_id as string)
      .maybeSingle();
    if (!(cp as any)?.email) return;

    const clientName = String((cp as any).username ?? (cp as any).full_name ?? "there");
    const amount = req.refund_type === "partial" && req.partial_amount
      ? `$${Number(req.partial_amount).toFixed(2)}`
      : "your payment";

    await notify({
      userId: req.client_id as string,
      userEmail: (cp as any).email as string,
      title: "Refund completed",
      message: `Your refund of ${amount} has been processed.`,
      type: "payment",
      emailHtml: buildRefundCompletedEmail(clientName, amount),
      emailSubject: "Refund completed — Capture Connect",
    });
  })().catch(() => {});
}

export type AdminReturnRequest = ReturnRequest & {
  clientName: string;
  proName: string;
};

export async function fetchAdminReturnRequests(): Promise<AdminReturnRequest[]> {
  await requireAdminRole();
  const { data, error } = await supabase
    .from("return_request")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Record<string, unknown>[];
  if (rows.length === 0) return [];

  const proIds = [...new Set(rows.map((r) => r.tradesperson_id as string))];
  const bookingIds = rows.filter((r) => r.booking_id).map((r) => r.booking_id as string);
  const orderIds = rows.filter((r) => r.order_id).map((r) => r.order_id as number);

  const [{ data: proProfiles }, { data: bookingRows }, { data: orderRows }] = await Promise.all([
    supabase
      .from("tradesperson_profiles")
      .select("id, full_name, username")
      .in("id", proIds),
    bookingIds.length > 0
      ? supabase.from("client_bookings").select("id, full_name").in("id", bookingIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    orderIds.length > 0
      ? supabase.from("client_shopping").select("id, full_name").in("id", orderIds)
      : Promise.resolve({ data: [] as { id: number; full_name: string }[] }),
  ]);

  const proNameMap: Record<string, string> = {};
  for (const p of proProfiles ?? []) {
    proNameMap[p.id as string] = String(p.username ?? p.full_name ?? "Unknown");
  }

  const bookingClientMap: Record<string, string> = {};
  for (const b of (bookingRows as { id: string; full_name: string }[] | null) ?? []) {
    bookingClientMap[b.id] = b.full_name ?? "Client";
  }

  const orderClientMap: Record<number, string> = {};
  for (const o of (orderRows as { id: number; full_name: string }[] | null) ?? []) {
    orderClientMap[o.id] = o.full_name ?? "Client";
  }

  return rows.map((r) => {
    const base = mapRequest(r);
    const clientName =
      base.bookingId
        ? (bookingClientMap[base.bookingId] ?? "Client")
        : base.orderId
        ? (orderClientMap[base.orderId] ?? "Client")
        : "Client";
    return {
      ...base,
      clientName,
      proName: proNameMap[base.tradespersonId] ?? "Pro",
    };
  });
}
