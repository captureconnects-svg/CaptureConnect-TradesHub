import { supabase } from "@/lib/supabase";
import { logActivity } from "@/backend/pro-activity";
import {
  sendAdminAlertEmail,
  buildAdminBookingCompletedAlertEmail,
  buildAdminCancelledPaidBookingAlertEmail,
  buildBookingRequestedEmail,
  buildBookingAcceptedEmail,
  buildBookingDeclinedEmail,
  buildBookingCancelledEmail,
  buildServiceCompletedEmail,
  buildEscrowFundedEmail,
  buildPaymentReleasedEmail,
  buildBookingRescheduledEmail,
} from "@/backend/notification-emails";
import { notify } from "@/backend/notify";

export type BookingAddon = {
  name: string;
  price: number;
};

export type BookingRecord = {
  id: string;
  pro: string;
  trade: string;
  initials: string;
  service: string;
  packageName: string;
  packagePrice: number;
  date: string;
  time: string;
  duration: number;
  location: string;
  notes: string;
  price: number;
  tip: number;
  addons: BookingAddon[];
  status: "confirmed" | "pending" | "completed" | "cancelled";
  paymentStatus: "paid" | "unpaid" | null;
  upcoming: boolean;
  reviewed?: boolean;
  createdAt: string;
  tradespersonId: string;
};

export async function submitBooking(params: {
  tradespersonId: string;
  fullName: string;
  phone: string;
  email: string;
  service: string;
  packageId: number | null;
  requestDate: string;
  requestTime: string;
  duration: number;
  location: string;
  notes: string;
  tipsOptional: number;
  basePrice: number;
  totalPrice: number;
  packagePrice: number;
}): Promise<string> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("client_bookings")
    .insert({
      client_id: authData.user.id,
      tradesperson_id: params.tradespersonId,
      full_name: params.fullName,
      phone: params.phone,
      email: params.email,
      service: params.service,
      package_id: params.packageId,
      request_date: params.requestDate,
      request_time: params.requestTime,
      duration: params.duration,
      location: params.location,
      notes: params.notes || null,
      tips_optional: params.tipsOptional || null,
      base_price: params.basePrice,
      total_price: params.totalPrice,
      booking_status: "pending",
      package_price: params.packagePrice,
    })
    .select("id")
    .single();

  if (error) throw error;

  logActivity({
    tradespersonId: params.tradespersonId,
    activityType: "booking",
    description: `${params.fullName} sent a booking request`,
    clientId: authData.user.id,
  }).catch(() => {});

  // Notify tradesperson of the new request (fire-and-forget)
  const _bookingId = data.id as string;
  ;(async () => {
    const { data: proProfile } = await supabase
      .from("tradesperson_profiles")
      .select("full_name, username, email")
      .eq("id", params.tradespersonId)
      .maybeSingle();
    if (!proProfile?.email) return;

    const proName = String(
      (proProfile as { username?: string; full_name?: string } | null)?.username ??
      (proProfile as { username?: string; full_name?: string } | null)?.full_name ??
      "there"
    );
    const APP_URL = (import.meta.env.VITE_APP_URL as string | undefined) ?? "https://tradehubmarketplace.com";
    await notify({
      userId: params.tradespersonId,
      userEmail: proProfile.email as string,
      title: "New booking request",
      message: `${params.fullName} has requested your service: ${params.service}.`,
      type: "booking",
      link: "/pro-dashboard?view=bookings",
      emailHtml: buildBookingRequestedEmail(proName, params.service, params.fullName, `${APP_URL}/pro-dashboard?view=bookings`),
      emailSubject: "New booking request — Capture Connect",
    });
  })().catch(() => {});

  return _bookingId;
}

export async function submitBookingAddons(
  bookingId: string,
  addons: { addonId: number; price: number }[],
): Promise<void> {
  if (addons.length === 0) return;

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Not authenticated");

  const { data: booking } = await supabase
    .from("client_bookings")
    .select("id")
    .eq("id", bookingId)
    .eq("client_id", authData.user.id)
    .maybeSingle();
  if (!booking) throw new Error("Booking not found");

  const { error } = await supabase
    .from("client_bookings.AddOns")
    .insert(
      addons.map((a) => ({
        booking_id: bookingId,
        addOn_id: a.addonId,
        addOn_price: a.price,
      })),
    );

  if (error) throw error;
}

export type ProBookingRecord = {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  service: string;
  packageName: string;
  packagePrice: number;
  addons: BookingAddon[];
  date: string;
  time: string;
  duration: number;
  location: string;
  notes: string;
  totalPrice: number;
  tip: number;
  status: "confirmed" | "pending" | "completed" | "cancelled";
  paymentStatus: "paid" | "unpaid" | null;
  refunded: boolean;
  createdAt: string;
};

export async function fetchProBookings(): Promise<ProBookingRecord[]> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return [];

  const { data: bookings } = await supabase
    .from("client_bookings")
    .select(
      "id, full_name, email, phone, service, request_date, request_time, duration, location, notes, total_price, booking_status, package_id, package_price, tips_optional, payment_status, refunded, created_at",
    )
    .eq("tradesperson_id", authData.user.id)
    .order("request_date", { ascending: false });

  if (!bookings || bookings.length === 0) return [];

  const bookingIds = bookings.map((b) => b.id as string);
  const packageIds = [
    ...new Set(
      bookings.filter((b) => b.package_id != null).map((b) => b.package_id as number),
    ),
  ];

  const [{ data: packageRows }, { data: bookingAddons }] = await Promise.all([
    packageIds.length > 0
      ? supabase.from("tradesperson_packages").select("id, package_name").in("id", packageIds)
      : Promise.resolve({ data: [] as { id: number; package_name: string }[] }),
    supabase
      .from("client_bookings.AddOns")
      .select("booking_id, addOn_id, addOn_price")
      .in("booking_id", bookingIds),
  ]);

  const packageNameMap: Record<number, string> = {};
  for (const pkg of packageRows ?? []) {
    packageNameMap[pkg.id as number] = pkg.package_name as string;
  }

  const addonIds = [...new Set((bookingAddons ?? []).map((a) => a.addOn_id as number))];
  const { data: addonDefs } =
    addonIds.length > 0
      ? await supabase.from("tradesperson_addOns").select("id, addOn_name").in("id", addonIds)
      : { data: [] as { id: number; addOn_name: string }[] };

  const addonNameMap: Record<number, string> = {};
  for (const def of addonDefs ?? []) {
    addonNameMap[def.id as number] = def.addOn_name as string;
  }

  const addonsByBooking: Record<string, BookingAddon[]> = {};
  for (const row of bookingAddons ?? []) {
    const bid = row.booking_id as string;
    if (!addonsByBooking[bid]) addonsByBooking[bid] = [];
    addonsByBooking[bid].push({
      name: addonNameMap[row.addOn_id as number] ?? "Add-on",
      price: Number(row.addOn_price ?? 0),
    });
  }

  return bookings.map((b) => ({
    id: b.id as string,
    clientName: (b.full_name as string) ?? "Client",
    clientEmail: (b.email as string) ?? "",
    clientPhone: (b.phone as string) ?? "",
    service: b.service as string,
    packageName: packageNameMap[b.package_id as number] ?? "",
    packagePrice: Number(b.package_price ?? 0),
    addons: addonsByBooking[b.id as string] ?? [],
    date: b.request_date as string,
    time: b.request_time as string,
    duration: Number(b.duration ?? 0),
    location: b.location as string,
    notes: (b.notes as string) ?? "",
    totalPrice: Number(b.total_price ?? 0),
    tip: Number(b.tips_optional ?? 0),
    status: (b.booking_status as string) as ProBookingRecord["status"],
    paymentStatus: (b.payment_status as "paid" | "unpaid" | null) ?? null,
    refunded: (b.refunded as boolean) ?? false,
    createdAt: (b.created_at as string) ?? (b.request_date as string),
  }));
}

export async function updateBookingStatus(
  bookingId: string,
  status: "confirmed" | "cancelled" | "completed",
): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Not authenticated");

  // Read previous status before update so we can distinguish decline vs cancel
  const { data: prev } = await supabase
    .from("client_bookings")
    .select("booking_status")
    .eq("id", bookingId)
    .eq("tradesperson_id", authData.user.id)
    .maybeSingle();
  const previousStatus = (prev?.booking_status as string) ?? null;

  const { error } = await supabase
    .from("client_bookings")
    .update({ booking_status: status })
    .eq("id", bookingId)
    .eq("tradesperson_id", authData.user.id);

  if (error) throw error;

  // Notify admin + client (fire-and-forget)
  ;(async () => {
    const { data: booking } = await supabase
      .from("client_bookings")
      .select("service, total_price, full_name, tradesperson_id, payment_status, client_id, email")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) return;

    const { data: pro } = await supabase
      .from("tradesperson_profiles")
      .select("full_name, username, email")
      .eq("id", booking.tradesperson_id as string)
      .maybeSingle();

    const proName = String(
      (pro as any)?.username ?? (pro as any)?.full_name ?? "Pro"
    );
    const proEmail = (pro as any)?.email as string | null;
    const proId = booking.tradesperson_id as string | null;
    const clientName = String(booking.full_name ?? "Client");
    const clientEmail = booking.email as string | null;
    const clientId = booking.client_id as string | null;
    const amount = `$${Number(booking.total_price).toFixed(2)}`;
    const service = booking.service as string;
    const APP_URL = (import.meta.env.VITE_APP_URL as string | undefined) ?? "https://tradehubmarketplace.com";
    const bookingsUrl = `${APP_URL}/client-dashboard/bookings`;

    // Admin alerts
    if (status === "completed") {
      await sendAdminAlertEmail(
        "Booking completed — Capture Connect",
        buildAdminBookingCompletedAlertEmail(clientName, proName, service, amount),
      );
    } else if (status === "cancelled" && booking.payment_status === "paid") {
      await sendAdminAlertEmail(
        "Cancelled paid booking — Capture Connect",
        buildAdminCancelledPaidBookingAlertEmail(clientName, proName, service, amount),
      );
    }

    // Pro notification: payment released when service is completed
    if (status === "completed" && proId && proEmail) {
      await notify({
        userId: proId,
        userEmail: proEmail,
        title: "Payment released",
        message: `Payment of ${amount} for ${service} has been released from escrow.`,
        type: "payment",
        link: "/pro-dashboard?view=payments",
        emailHtml: buildPaymentReleasedEmail(proName, amount),
        emailSubject: "Payment released — Capture Connect",
      });
    }

    // Client notification
    if (!clientEmail || !clientId) return;

    if (status === "confirmed") {
      await notify({
        userId: clientId,
        userEmail: clientEmail,
        title: "Booking accepted",
        message: `Your booking for ${service} has been accepted by ${proName}.`,
        type: "booking",
        link: "/client-dashboard/bookings",
        emailHtml: buildBookingAcceptedEmail(clientName, service, bookingsUrl),
        emailSubject: "Your booking was accepted — Capture Connect",
      });
    } else if (status === "cancelled") {
      // Declined = pro rejecting a pending request; Cancelled = cancelling a confirmed booking
      const isDecline = previousStatus === "pending";
      if (isDecline) {
        await notify({
          userId: clientId,
          userEmail: clientEmail,
          title: "Booking declined",
          message: `Your booking request for ${service} was declined.`,
          type: "booking",
          link: "/client-dashboard/bookings",
          emailHtml: buildBookingDeclinedEmail(clientName, service),
          emailSubject: "Your booking was declined — Capture Connect",
        });
      } else {
        await notify({
          userId: clientId,
          userEmail: clientEmail,
          title: "Booking cancelled",
          message: `Your booking for ${service} has been cancelled.`,
          type: "booking",
          link: "/client-dashboard/bookings",
          emailHtml: buildBookingCancelledEmail(clientName, service, proName),
          emailSubject: "Booking cancelled — Capture Connect",
        });
      }
    } else if (status === "completed") {
      await notify({
        userId: clientId,
        userEmail: clientEmail,
        title: "Service completed",
        message: `Your booking for ${service} has been marked as complete. Please leave a review.`,
        type: "review",
        link: "/client-dashboard/bookings",
        emailHtml: buildServiceCompletedEmail(clientName, service, bookingsUrl),
        emailSubject: "Your service is complete — leave a review — Capture Connect",
      });
    }
  })().catch(() => {});
}

export async function rescheduleBooking(
  bookingId: string,
  date: string,
  time: string,
  location: string,
): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Not authenticated");

  const uid = authData.user.id;
  const { error } = await supabase
    .from("client_bookings")
    .update({ request_date: date, request_time: time, location })
    .eq("id", bookingId)
    .or(`client_id.eq.${uid},tradesperson_id.eq.${uid}`);

  if (error) throw error;

  // Notify client when the pro reschedules the booking (fire-and-forget)
  ;(async () => {
    const { data: booking } = await supabase
      .from("client_bookings")
      .select("service, full_name, email, client_id, tradesperson_id")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) return;
    if (booking.tradesperson_id !== uid) return;

    const clientEmail = booking.email as string | null;
    const clientId = booking.client_id as string | null;
    if (!clientEmail || !clientId) return;

    const { data: pro } = await supabase
      .from("tradesperson_profiles")
      .select("full_name, username")
      .eq("id", uid)
      .maybeSingle();
    const proName = String((pro as any)?.username ?? (pro as any)?.full_name ?? "Your pro");
    const clientName = String(booking.full_name ?? "Client");
    const service = booking.service as string;
    const APP_URL = (import.meta.env.VITE_APP_URL as string | undefined) ?? "https://tradehubmarketplace.com";
    const bookingsUrl = `${APP_URL}/client-dashboard/bookings`;

    await notify({
      userId: clientId,
      userEmail: clientEmail,
      title: "Booking rescheduled",
      message: `${proName} rescheduled your booking for ${service} to ${date} at ${time}.`,
      type: "booking",
      link: "/client-dashboard/bookings",
      emailHtml: buildBookingRescheduledEmail(clientName, service, proName, date, time, bookingsUrl),
      emailSubject: "Your booking was rescheduled — Capture Connect",
    });
  })().catch(() => {});
}

export async function markBookingPaid(bookingId: string): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("client_bookings")
    .update({ payment_status: "paid" })
    .eq("id", bookingId)
    .eq("tradesperson_id", authData.user.id);
  if (error) throw error;

  // Notify pro that payment is now held in escrow (fire-and-forget)
  ;(async () => {
    const { data: booking } = await supabase
      .from("client_bookings")
      .select("service, total_price")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) return;

    const { data: profile } = await supabase
      .from("tradesperson_profiles")
      .select("full_name, username, email")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (!(profile as any)?.email) return;

    const proName = String((profile as any).username ?? (profile as any).full_name ?? "there");
    const amount = `$${Number(booking.total_price).toFixed(2)}`;
    const service = booking.service as string;

    await notify({
      userId: authData.user.id,
      userEmail: (profile as any).email as string,
      title: "Payment held in escrow",
      message: `$${amount} has been placed in escrow for ${service}.`,
      type: "payment",
      link: "/pro-dashboard?view=payments",
      emailHtml: buildEscrowFundedEmail(proName, amount, service),
      emailSubject: "Payment held in escrow — Capture Connect",
    });
  })().catch(() => {});
}

export async function fetchBookingById(bookingId: string): Promise<BookingRecord | null> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const { data: b } = await supabase
    .from("client_bookings")
    .select(
      "id, tradesperson_id, service, request_date, request_time, duration, location, notes, total_price, booking_status, package_id, package_price, tips_optional, payment_status, created_at",
    )
    .eq("id", bookingId)
    .eq("client_id", authData.user.id)
    .single();

  if (!b) return null;

  const traderId = b.tradesperson_id as string;
  const packageId = b.package_id as number | null;

  const [{ data: profiles }, { data: specialties }, { data: packageRows }, { data: bookingAddons }] =
    await Promise.all([
      supabase.from("tradesperson_profiles").select("id, full_name, username").eq("id", traderId),
      supabase.from("tradesperson_specialty").select("tradesperson_id, specialty").eq("tradesperson_id", traderId),
      packageId != null
        ? supabase.from("tradesperson_packages").select("id, package_name").eq("id", packageId)
        : Promise.resolve({ data: [] as { id: number; package_name: string }[] }),
      supabase.from("client_bookings.AddOns").select("booking_id, addOn_id, addOn_price").eq("booking_id", bookingId),
    ]);

  const profile = profiles?.[0];
  const name = String(profile?.username ?? profile?.full_name ?? "Unknown");
  const parts = name.split(" ").filter(Boolean);
  const initials = parts.slice(0, 2).map((w: string) => w[0].toUpperCase()).join("") || "?";

  const addonIds = [...new Set((bookingAddons ?? []).map((a) => a.addOn_id as number))];
  const { data: addonDefs } =
    addonIds.length > 0
      ? await supabase.from("tradesperson_addOns").select("id, addOn_name").in("id", addonIds)
      : { data: [] as { id: number; addOn_name: string }[] };

  const addonNameMap: Record<number, string> = {};
  for (const def of addonDefs ?? []) addonNameMap[def.id as number] = def.addOn_name as string;

  const addons: BookingAddon[] = (bookingAddons ?? []).map((row) => ({
    name: addonNameMap[row.addOn_id as number] ?? "Add-on",
    price: Number(row.addOn_price ?? 0),
  }));

  const status = (b.booking_status as string) ?? "pending";
  const requestDate = b.request_date as string;
  const today = new Date().toISOString().split("T")[0];

  return {
    id: b.id as string,
    pro: name,
    trade: (specialties?.[0]?.specialty as string) ?? "Tradesperson",
    initials,
    service: b.service as string,
    packageName: (packageRows?.[0] as { id: number; package_name: string } | undefined)?.package_name ?? "Package",
    packagePrice: Number(b.package_price ?? 0),
    date: requestDate,
    time: b.request_time as string,
    duration: Number(b.duration ?? 0),
    location: b.location as string,
    notes: (b.notes as string) ?? "",
    price: Number(b.total_price ?? 0),
    tip: Number(b.tips_optional ?? 0),
    addons,
    status: status as BookingRecord["status"],
    paymentStatus: (b.payment_status as "paid" | "unpaid" | null) ?? null,
    upcoming: requestDate >= today,
    createdAt: (b.created_at as string) ?? requestDate,
    tradespersonId: traderId,
  };
}

export async function fetchTraderConfirmedBookingDates(
  tradespersonId: string,
): Promise<{ date: string; time: string }[]> {
  const { data } = await supabase
    .from("client_bookings")
    .select("request_date, request_time")
    .eq("tradesperson_id", tradespersonId)
    .eq("booking_status", "confirmed");

  if (!data) return [];
  return data.map((b) => ({
    date: b.request_date as string,
    time: b.request_time as string,
  }));
}

export async function fetchClientBookings(): Promise<BookingRecord[]> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return [];

  const { data: bookings, error: bookingsError } = await supabase
    .from("client_bookings")
    .select(
      "id, tradesperson_id, service, request_date, request_time, duration, location, notes, total_price, booking_status, package_id, package_price, tips_optional, payment_status, created_at",
    )
    .eq("client_id", authData.user.id)
    .order("request_date", { ascending: false });

  if (bookingsError) {
    console.error("fetchClientBookings:", bookingsError.message);
    return [];
  }
  if (!bookings || bookings.length === 0) return [];

  const traderIds = [...new Set(bookings.map((b) => b.tradesperson_id as string))];
  const bookingIds = bookings.map((b) => b.id as string);
  const packageIds = [
    ...new Set(
      bookings.filter((b) => b.package_id != null).map((b) => b.package_id as number),
    ),
  ];

  const [
    { data: profiles },
    { data: specialties },
    { data: packageRows },
    { data: bookingAddons },
  ] = await Promise.all([
    supabase
      .from("tradesperson_profiles")
      .select("id, full_name, username")
      .in("id", traderIds),
    supabase
      .from("tradesperson_specialty")
      .select("tradesperson_id, specialty")
      .in("tradesperson_id", traderIds),
    packageIds.length > 0
      ? supabase
          .from("tradesperson_packages")
          .select("id, package_name")
          .in("id", packageIds)
      : Promise.resolve({ data: [] as { id: number; package_name: string }[] }),
    supabase
      .from("client_bookings.AddOns")
      .select("booking_id, addOn_id, addOn_price")
      .in("booking_id", bookingIds),
  ]);

  const addonIds = [
    ...new Set((bookingAddons ?? []).map((a) => a.addOn_id as number)),
  ];
  const { data: addonDefs } =
    addonIds.length > 0
      ? await supabase
          .from("tradesperson_addOns")
          .select("id, addOn_name")
          .in("id", addonIds)
      : { data: [] as { id: number; addOn_name: string }[] };

  const profileMap: Record<string, { name: string; initials: string }> = {};
  for (const p of profiles ?? []) {
    const name = String(p.username ?? p.full_name ?? "Unknown");
    const parts = name.split(" ").filter(Boolean);
    const initials =
      parts
        .slice(0, 2)
        .map((w: string) => w[0].toUpperCase())
        .join("") || "?";
    profileMap[p.id as string] = { name, initials };
  }

  const tradeMap: Record<string, string> = {};
  for (const s of specialties ?? []) {
    if (!tradeMap[s.tradesperson_id as string]) {
      tradeMap[s.tradesperson_id as string] = s.specialty as string;
    }
  }

  const packageNameMap: Record<number, string> = {};
  for (const pkg of packageRows ?? []) {
    packageNameMap[pkg.id as number] = pkg.package_name as string;
  }

  const addonNameMap: Record<number, string> = {};
  for (const def of addonDefs ?? []) {
    addonNameMap[def.id as number] = def.addOn_name as string;
  }

  const addonsByBooking: Record<string, BookingAddon[]> = {};
  for (const row of bookingAddons ?? []) {
    const bid = row.booking_id as string;
    if (!addonsByBooking[bid]) addonsByBooking[bid] = [];
    addonsByBooking[bid].push({
      name: addonNameMap[row.addOn_id as number] ?? "Add-on",
      price: Number(row.addOn_price ?? 0),
    });
  }

  const today = new Date().toISOString().split("T")[0];

  return bookings.map((b) => {
    const traderId = b.tradesperson_id as string;
    const profile = profileMap[traderId] ?? { name: "Unknown", initials: "?" };
    const status = (b.booking_status as string) ?? "pending";
    const requestDate = b.request_date as string;

    return {
      id: b.id as string,
      pro: profile.name,
      trade: tradeMap[traderId] ?? "Tradesperson",
      initials: profile.initials,
      service: b.service as string,
      packageName: packageNameMap[b.package_id as number] ?? "Package",
      packagePrice: Number(b.package_price ?? 0),
      date: requestDate,
      time: b.request_time as string,
      duration: Number(b.duration ?? 0),
      location: b.location as string,
      notes: (b.notes as string) ?? "",
      price: Number(b.total_price ?? 0),
      tip: Number(b.tips_optional ?? 0),
      addons: addonsByBooking[b.id as string] ?? [],
      status: status as BookingRecord["status"],
      paymentStatus: (b.payment_status as "paid" | "unpaid" | null) ?? null,
      upcoming:
        requestDate >= today &&
        status !== "cancelled" &&
        status !== "completed",
      createdAt: (b.created_at as string) ?? requestDate,
      tradespersonId: traderId,
    };
  });
}
