/**
 * email-templates.ts
 *
 * Single source of truth for every outbound email's HTML — every
 * `buildXxxEmail()` function used by the app lives here, whether it's sent
 * from the browser (src/backend/notification-emails.ts, via notify()) or
 * from a Supabase Edge Function (supabase/functions/_shared/emails.ts, for
 * server-triggered events like the Stripe webhook).
 *
 * This file is imported by both the Vite frontend and Deno edge functions,
 * so it must not depend on either runtime: no `@/lib/supabase`, no bare
 * `import.meta.env` / `Deno.env` property access (typed ambient globals
 * differ between the two toolchains) — see readEnv()/readDenoEnv() below.
 */

function readViteEnv(key: string): string | undefined {
  const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
  return meta.env?.[key];
}

function readDenoEnv(key: string): string | undefined {
  const g = globalThis as unknown as { Deno?: { env: { get(k: string): string | undefined } } };
  return g.Deno?.env.get(key);
}

function resolveEnv(viteKey: string, denoKey: string, fallback: string): string {
  return readViteEnv(viteKey) ?? readDenoEnv(denoKey) ?? fallback;
}

export const APP_URL = resolveEnv("VITE_APP_URL", "APP_URL", "https://tradehubmarketplace.com");

// Served from public/ (not imported via the Vite asset pipeline) so the URL is
// identical in local dev, production, and Deno — a Vite-hashed src/assets
// import would resolve to a dev-server-only path that doesn't exist once
// emailed out and opened against the deployed site, and Deno couldn't
// resolve a bundler asset import at all.
const LOGO_URL = `${APP_URL}/logo-withBranding.png`;

// CTA buttons always send the recipient to sign in first, not straight to a deep link they
// can't access while logged out — and to the login page that matches their account type.
const PRO_LOGIN_URL = `${APP_URL}/pro-login-signup`;
const CLIENT_LOGIN_URL = `${APP_URL}/client-login-signup`;

// ── Shared templates ──────────────────────────────────────────────────────

function baseTemplate(title: string, body: string, cta?: { label: string; url: string }): string {
  const ctaBlock = cta
    ? `<div style="text-align:center;margin:32px 0;">
         <a href="${cta.url}"
            style="background:#0f172a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;display:inline-block;">
           ${cta.label}
         </a>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:#0f172a;padding:24px 32px;text-align:center;">
          <img src="${LOGO_URL}" alt="Capture Connect-TradeHub Marketplace" width="40%" height="40%" style="display:inline-block;" />
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0f172a;">${title}</h1>
          ${body}
          ${ctaBlock}
          <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#334155;">Thank you,<br><strong>Your Capture Connect Team</strong></p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
            You are receiving this because you have an account on Capture Connect-TradeHub Marketplace.<br>
            To manage email preferences, visit your account settings.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155;">${text}</p>`;
}

// ── Booking emails ─────────────────────────────────────────────────────────

export function buildBookingRequestedEmail(tradespersonName: string, service: string, clientName: string): string {
  return baseTemplate(
    "New booking request",
    p(`Hi ${tradespersonName},`) +
      p(`<strong>${clientName}</strong> has requested your service: <strong>${service}</strong>.`) +
      p("Review the details and accept or decline within 24 hours."),
    { label: "View booking", url: PRO_LOGIN_URL }
  );
}

export function buildBookingAcceptedEmail(clientName: string, service: string): string {
  return baseTemplate(
    "Your booking was accepted",
    p(`Hi ${clientName},`) +
      p(`Your booking for <strong>${service}</strong> has been accepted.`) +
      p("You can view the full details and track your booking below."),
    { label: "View booking", url: CLIENT_LOGIN_URL }
  );
}

export function buildBookingDeclinedEmail(clientName: string, service: string): string {
  return baseTemplate(
    "Your booking was declined",
    p(`Hi ${clientName},`) +
      p(`Unfortunately your booking request for <strong>${service}</strong> was declined.`) +
      p("You can browse other professionals on the platform and try again.")
  );
}

export function buildBookingCancelledEmail(recipientName: string, service: string, cancelledBy: string): string {
  return baseTemplate(
    "Booking cancelled",
    p(`Hi ${recipientName},`) +
      p(`The booking for <strong>${service}</strong> has been cancelled by ${cancelledBy}.`) +
      p("If you have any questions, please contact support.")
  );
}

export function buildBookingRescheduledEmail(clientName: string, service: string, proName: string, date: string, time: string): string {
  return baseTemplate(
    "Your booking has been rescheduled",
    p(`Hi ${clientName},`) +
      p(`<strong>${proName}</strong> has rescheduled your booking for <strong>${service}</strong> to <strong>${date}</strong> at <strong>${time}</strong>.`) +
      p(`Please make sure the new date and time work for you. If you have any questions, feel free to reach out to ${proName}.`),
    { label: "View booking", url: CLIENT_LOGIN_URL }
  );
}

export function buildBookingReminderEmail(recipientName: string, service: string, date: string, userType: "pro" | "client"): string {
  return baseTemplate(
    "Upcoming booking reminder",
    p(`Hi ${recipientName},`) +
      p(`This is a reminder that your booking for <strong>${service}</strong> is coming up on <strong>${date}</strong>.`),
    { label: "View booking", url: userType === "pro" ? PRO_LOGIN_URL : CLIENT_LOGIN_URL }
  );
}

export function buildServiceCompletedEmail(clientName: string, service: string): string {
  return baseTemplate(
    "Service completed",
    p(`Hi ${clientName},`) +
      p(`Your booking for <strong>${service}</strong> has been marked as complete. We hope everything went smoothly!`) +
      p("Please take a moment to leave a review — it helps other clients and recognises quality work."),
    { label: "Leave a review", url: CLIENT_LOGIN_URL }
  );
}

// ── Payment emails ─────────────────────────────────────────────────────────

export function buildEscrowFundedEmail(tradespersonName: string, amount: string, service: string): string {
  return baseTemplate(
    "Payment held in escrow",
    p(`Hi ${tradespersonName},`) +
      p(`<strong>${amount}</strong> for <strong>${service}</strong> is now held in escrow.`) +
      p("It will be released to you after the standard hold period, once reviewed.")
  );
}

export function buildPayoutReceiptEmail(
  proName: string,
  amount: string,
  transferMethod: string,
  transferReference: string,
  transferDate: string,
  receiptNumber: string,
): string {
  return baseTemplate(
    "Your payout has been sent",
    p(`Hi ${proName},`) +
      p(`Congratulations — the funds for your payout of <strong>${amount}</strong> have been released from escrow and transferred. They're on their way to you now.`) +
      p(
        `<strong>Transfer method:</strong> ${transferMethod}<br>` +
          `<strong>Transfer reference:</strong> ${transferReference || "—"}<br>` +
          `<strong>Transfer date:</strong> ${transferDate}`,
      ) +
      p(
        `Your official TradeHub payout receipt (<strong>${receiptNumber}</strong>) is available on your portal — head to your payments dashboard to view or download it.`,
      ),
    { label: "View Payouts", url: PRO_LOGIN_URL },
  );
}

export function buildRefundInitiatedEmail(
  clientName: string,
  amount: string,
  service: string,
  refLabel: string,
  proName: string,
): string {
  return baseTemplate(
    "Refund initiated",
    p(`Hi ${clientName},`) +
      p(`A refund of <strong>${amount}</strong> for <strong>${refLabel}</strong> (${service} with <strong>${proName}</strong>) has been initiated.`) +
      p("Refunds typically take 5–10 business days to process.")
  );
}

export function buildRefundCompletedEmail(clientName: string, amount: string): string {
  return baseTemplate(
    "Refund completed",
    p(`Hi ${clientName},`) +
      p(`Your refund of <strong>${amount}</strong> has been processed and returned to your original payment method.`)
  );
}

export function buildRefundDeniedEmail(clientName: string, service: string, reason: string): string {
  return baseTemplate(
    "Refund request denied",
    p(`Hi ${clientName},`) +
      p(`Your refund request for <strong>${service}</strong> was denied.`) +
      p(`Reason: ${reason}`) +
      p("If you believe this is an error, please contact our support team.")
  );
}

export function buildPaymentReceivedClientEmail(
  clientName: string,
  amount: string,
  label: string,
  dashboardUrl: string,
): string {
  return baseTemplate(
    "Payment received",
    p(`Hi ${clientName},`) +
      p(`Your payment of <strong>${amount}</strong> for <strong>${label}</strong> was successful.`) +
      p("Your payment is held within the platform until the service has been completed, at which point it will be released."),
    { label: "View details", url: dashboardUrl },
  );
}

/** Sent when the job is already completed at the moment payment settles — escrow starts immediately. */
export function buildPaymentReceivedProEmail(proName: string, amount: string, label: string): string {
  return baseTemplate(
    "Payment received",
    p(`Hi ${proName},`) +
      p(`A payment of <strong>${amount}</strong> was received for <strong>${label}</strong>.`) +
      p("Since the job is already marked complete, the funds have been placed in escrow and will be released to you once the standard hold period has passed."),
  );
}

/** Sent for the normal ordering — payment settles before the job is marked complete, so escrow hasn't started yet. */
export function buildPaymentReceivedPendingCompletionProEmail(
  proName: string,
  clientName: string,
  amount: string,
  refLabel: string,
  label: string,
): string {
  return baseTemplate(
    `Payment received for ${refLabel}`,
    p(`Hi ${proName},`) +
      p(`A payment of <strong>${amount}</strong> from <strong>${clientName}</strong> was received for <strong>${refLabel}</strong> (${label}).`) +
      p("The funds are held in the marketplace until the service is completed."),
  );
}

export function buildPaymentFailedEmail(
  clientName: string,
  amount: string,
  label: string,
  retryUrl: string,
): string {
  return baseTemplate(
    "Payment failed",
    p(`Hi ${clientName},`) +
      p(`Your payment of <strong>${amount}</strong> for <strong>${label}</strong> could not be processed.`) +
      p("Please try again with a different payment method."),
    { label: "Retry payment", url: retryUrl },
  );
}

export function buildRefundProcessedClientEmail(clientName: string, amount: string, label: string): string {
  return baseTemplate(
    "Refund processed",
    p(`Hi ${clientName},`) +
      p(`A refund of <strong>${amount}</strong> for <strong>${label}</strong> has been processed.`) +
      p("Refunds typically take 5–10 business days to appear on your statement."),
  );
}

export function buildRefundProcessedProEmail(proName: string, amount: string, label: string): string {
  return baseTemplate(
    "Payment refunded",
    p(`Hi ${proName},`) +
      p(`<strong>${amount}</strong> was refunded to the client for <strong>${label}</strong>.`) +
      p("No action is needed on your end."),
  );
}

// ── Verification emails ────────────────────────────────────────────────────

export function buildDocumentsReceivedEmail(name: string): string {
  return baseTemplate(
    "Documents received",
    p(`Hi ${name},`) +
      p("We've received your verification documents. Our team will review them within 1–3 business days.") +
      p("We'll notify you as soon as the review is complete.")
  );
}

export function buildVerificationApprovedEmail(name: string): string {
  return baseTemplate(
    "Verification approved",
    p(`Hi ${name},`) +
      p("Congratulations! Your account has been verified. You now have access to all Pro features on the platform.")
  );
}

export function buildVerificationRejectedEmail(name: string, reason: string): string {
  return baseTemplate(
    "Verification rejected",
    p(`Hi ${name},`) +
      p("Unfortunately we were unable to verify your account.") +
      p(`Reason: ${reason}`) +
      p("You are welcome to resubmit with the correct documents.")
  );
}

// ── Review emails ──────────────────────────────────────────────────────────

export function buildReviewReceivedEmail(tradespersonName: string, rating: number): string {
  return baseTemplate(
    "You received a new review",
    p(`Hi ${tradespersonName},`) +
      p(`You received a <strong>${rating}-star review</strong> on Capture Connect-TradeHub Marketplace.`) +
      p("Click below to see the full review."),
    { label: "View review", url: PRO_LOGIN_URL }
  );
}

export function buildReviewReminderEmail(clientName: string, service: string): string {
  return baseTemplate(
    "Don't forget to leave a review",
    p(`Hi ${clientName},`) +
      p(`You recently booked <strong>${service}</strong>. We'd love to hear how it went!`) +
      p("Your feedback helps maintain quality on the platform."),
    { label: "Leave a review", url: CLIENT_LOGIN_URL }
  );
}

// ── Administration emails ──────────────────────────────────────────────────

export function buildSuspensionEmail(name: string, reason: string): string {
  return baseTemplate(
    "Your account has been suspended",
    p(`Hi ${name},`) +
      p("Your Capture Connect-TradeHub Marketplace account has been suspended.") +
      p(`Reason: ${reason}`) +
      p("Please contact our support team if you believe this was made in error.")
  );
}

export function buildReinstatementEmail(name: string): string {
  return baseTemplate(
    "Your account has been reinstated",
    p(`Hi ${name},`) +
      p("Great news — your Capture Connect-TradeHub Marketplace account has been reinstated and you can log in normally again.")
  );
}

export function buildPolicyUpdateEmail(name: string, policyTitle: string, summary: string, userType: "pro" | "client"): string {
  return baseTemplate(
    `Important: ${policyTitle}`,
    p(`Hi ${name},`) +
      p(`We've made an important update to our <strong>${policyTitle}</strong>.`) +
      p(summary),
    { label: "Read the update", url: userType === "pro" ? PRO_LOGIN_URL : CLIENT_LOGIN_URL }
  );
}

// ── Account deletion emails ────────────────────────────────────────────────

export function buildAccountDeletedEmail(name: string, userType: string): string {
  const displayType = userType.charAt(0).toUpperCase() + userType.slice(1);
  const retainedRecords = userType === "pro"
    ? "job records, payment history, and dispute correspondence"
    : "transaction records, payment history, booking details, and dispute correspondence";
  return baseTemplate(
    "Your account has been deleted",
    p(`Hi ${name},`) +
      p("We're sorry to see you go.") +
      p(`Your Capture Connect-TradeHub Marketplace <strong>${displayType}</strong> account has been permanently deleted as requested, and your profile and platform data have been removed.`) +
      p(
        `<strong>Data Retention After Account Deletion.</strong> Certain information — including ${retainedRecords} — is retained for up to 12 months from the date of deletion for legal, regulatory, and fraud-prevention purposes. After that period it is permanently deleted, except where a longer period is required by law. During retention, this data will not be used for marketing and will not be accessible to you via the platform.`,
      ) +
      p("If you believe this was a mistake, please contact our support team as soon as possible.")
  );
}

// ── Testimonial emails ─────────────────────────────────────────────────────

export function buildTestimonialSubmittedEmail(name: string): string {
  return baseTemplate(
    "Testimonial received",
    p(`Hi ${name},`) +
      p("Thank you for submitting your testimonial! Our team will review it within 1–3 business days.") +
      p("We'll notify you once a decision has been made.")
  );
}

export function buildTestimonialApprovedEmail(name: string): string {
  return baseTemplate(
    "Testimonial approved",
    p(`Hi ${name},`) +
      p("Great news — your testimonial has been approved and is now live on the Capture Connect-TradeHub Marketplace platform.") +
      p("Thank you for sharing your experience with our community!")
  );
}

export function buildTestimonialRejectedEmail(name: string): string {
  return baseTemplate(
    "Testimonial not approved",
    p(`Hi ${name},`) +
      p("Unfortunately your testimonial could not be approved at this time. It may not meet our content guidelines.") +
      p("You are welcome to submit a new testimonial. If you have any questions, please contact our support team.")
  );
}

// ── 24-hour booking reminder (client) ─────────────────────────────────────

export function buildBooking24hrReminderEmail(clientName: string, service: string, date: string, time: string): string {
  return baseTemplate(
    "Your booking is tomorrow",
    p(`Hi ${clientName},`) +
      p(`This is a reminder that your booking for <strong>${service}</strong> is scheduled for tomorrow, <strong>${date}</strong> at <strong>${time}</strong>.`) +
      p("Please ensure you are available at the agreed location."),
    { label: "View booking", url: CLIENT_LOGIN_URL }
  );
}

// ── Shopping order emails ──────────────────────────────────────────────────

export function buildOrderDeliveredEmail(fullName: string, shippingMethod: string): string {
  const isDelivery = shippingMethod === "delivery";
  return baseTemplate(
    isDelivery ? "Your order has been delivered" : "Your order is ready for pickup",
    p(`Hi ${fullName},`) +
      p(isDelivery
        ? "Your order has been marked as delivered. We hope everything arrived in great condition!"
        : "Your order has been marked as picked up. We hope everything met your expectations!") +
      p("If you have any issues with your order, please contact the seller or our support team."),
    { label: "View order", url: CLIENT_LOGIN_URL }
  );
}

// ── Account switch emails ──────────────────────────────────────────────────

export function buildSwitchedToClientEmail(name: string): string {
  return baseTemplate(
    "You've switched to your Client account",
    p(`Hi ${name},`) +
      p("Your account has been switched to <strong>Client</strong> mode. Your Pro profile has been deactivated.") +
      p("You can switch back at any time from your account settings. Please log in again using the client login page.")
  );
}

export function buildSwitchedToProEmail(name: string): string {
  return baseTemplate(
    "You've switched to your Pro account",
    p(`Hi ${name},`) +
      p("Your account has been switched to <strong>Pro</strong> mode. Your Client profile has been deactivated.") +
      p("You can switch back at any time from your account settings. Please log in again using the Pro login page.")
  );
}

// ── Admin alert emails ─────────────────────────────────────────────────────
// These are sent TO the admin, not to users.

function adminAlertTemplate(title: string, body: string, cta?: { label: string; url: string }): string {
  const ctaBlock = cta
    ? `<div style="text-align:center;margin:32px 0;">
         <a href="${cta.url}"
            style="background:#f59e0b;color:#000;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;display:inline-block;">
           ${cta.label}
         </a>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <tr><td style="background:#f59e0b;padding:16px 32px;text-align:center;">
          <span style="font-size:12px;font-weight:700;color:#000;letter-spacing:0.08em;text-transform:uppercase;">Admin Alert — Capture Connect-TradeHub Marketplace</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0f172a;">${title}</h1>
          ${body}
          ${ctaBlock}
          <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">This is an automated admin alert from Capture Connect-TradeHub Marketplace.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
            Sent to the admin account only. Do not forward this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function adminLink(view: string): string {
  return `${APP_URL}/mgmt-3d856e45?view=${view}`;
}

export function buildAdminVerificationAlertEmail(proName: string, proEmail: string): string {
  return adminAlertTemplate(
    "New verification request",
    p(`<strong>${proName}</strong> (<a href="mailto:${proEmail}" style="color:#0f172a;">${proEmail}</a>) has submitted identity and document verification.`) +
      p("Please review the submitted documents and approve or reject the application."),
    { label: "Review verification", url: adminLink("verifications") }
  );
}

export function buildAdminTestimonialAlertEmail(authorName: string, authorEmail: string, excerpt: string): string {
  return adminAlertTemplate(
    "New testimonial awaiting approval",
    p(`<strong>${authorName}</strong> (<a href="mailto:${authorEmail}" style="color:#0f172a;">${authorEmail}</a>) has submitted a testimonial.`) +
      p(`<em style="color:#475569;">"${excerpt}"</em>`) +
      p("Please review and approve or reject the testimonial."),
    { label: "Review testimonial", url: adminLink("testimonials") }
  );
}

export function buildAdminRefundRequestAlertEmail(clientName: string, clientEmail: string, amount: string, service: string): string {
  return adminAlertTemplate(
    "New refund request",
    p(`<strong>${clientName}</strong> (<a href="mailto:${clientEmail}" style="color:#0f172a;">${clientEmail}</a>) has requested a refund of <strong>${amount}</strong> for <strong>${service}</strong>.`) +
      p("Please review the request and process it accordingly."),
    { label: "Review refund request", url: adminLink("refund-requests") }
  );
}

export function buildAdminBookingCompletedAlertEmail(clientName: string, proName: string, service: string, amount: string): string {
  return adminAlertTemplate(
    "Booking marked as completed",
    p(`A booking for <strong>${service}</strong> between client <strong>${clientName}</strong> and pro <strong>${proName}</strong> has been marked as complete.`) +
      p(`Total value: <strong>${amount}</strong>.`) +
      p("Funds will be released from escrow automatically. Review the booking if anything looks unusual."),
    { label: "Review bookings", url: adminLink("bookings") }
  );
}

export function buildAdminCancelledPaidBookingAlertEmail(clientName: string, proName: string, service: string, amount: string): string {
  return adminAlertTemplate(
    "Cancelled booking — payment already made",
    p(`A booking for <strong>${service}</strong> between client <strong>${clientName}</strong> and pro <strong>${proName}</strong> has been cancelled.`) +
      p(`The client had already paid <strong>${amount}</strong>. A refund may need to be issued.`) +
      p("Please review and process a refund if applicable."),
    { label: "Review bookings", url: adminLink("bookings") }
  );
}

export function buildContactRequestReplyEmail(name: string, subject: string, reply: string): string {
  return baseTemplate(
    `Re: ${subject}`,
    p(`Hi ${name},`) +
      p("Thanks for reaching out to Capture Connect-TradeHub Marketplace. Here's our reply to your message:") +
      p(reply.replace(/\n/g, "<br>")) +
      p("If you have any further questions, just reply to this email.")
  );
}

export function buildAdminOrderFulfilledAlertEmail(clientName: string, proName: string, shippingMethod: string, amount: string): string {
  const isDelivery = shippingMethod === "delivery";
  return adminAlertTemplate(
    isDelivery ? "Order marked as delivered" : "Order marked as picked up",
    p(`<strong>${proName}</strong> has marked an order for <strong>${clientName}</strong> as <strong>${isDelivery ? "delivered" : "picked up"}</strong>.`) +
      p(`Order total: <strong>${amount}</strong>.`) +
      p("Review the order if anything looks unusual."),
    { label: "Review orders", url: adminLink("orders") }
  );
}

export function buildAdminContactRequestAlertEmail(senderName: string, senderEmail: string, subject: string, messageExcerpt: string): string {
  return adminAlertTemplate(
    "New contact request",
    p(`<strong>${senderName}</strong> (<a href="mailto:${senderEmail}" style="color:#0f172a;">${senderEmail}</a>) has submitted a contact request.`) +
      p(`Subject: <strong>${subject}</strong>`) +
      p(`<em style="color:#475569;">"${messageExcerpt}"</em>`) +
      p("Please respond to the sender at your earliest convenience."),
    { label: "View contact requests", url: adminLink("contact-requests") }
  );
}

export function buildAdminPayoutsReadyAlertEmail(count: number, totalsLine: string): string {
  return adminAlertTemplate(
    count === 1 ? "1 payout is ready to release" : `${count} payouts are ready to release`,
    p(
      count === 1
        ? `<strong>1 payment</strong> has cleared its escrow hold period and is now waiting to be paid out.`
        : `<strong>${count} payments</strong> have cleared their escrow hold period and are now waiting to be paid out.`,
    ) +
      p(`Total outstanding: <strong>${totalsLine}</strong>.`) +
      p("Review and release these payouts from the admin payments dashboard."),
    { label: "Review payouts", url: `${APP_URL}/mgmt-3d856e45?view=payments` },
  );
}
