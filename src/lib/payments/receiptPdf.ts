import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImg from "@/assets/logo-withoutBranding.png";
import type { Payment } from "./types";

export interface PayoutReceiptLineItem {
  ref: string;
  service: string;
  date: string;
  gross: number;
  commission: number;
  net: number;
  /** Amount refunded to the client against this specific booking/order, if any (payment.refunded_amount). */
  refunded: number;
}

export interface PayoutReceiptData {
  receiptNumber: string;
  payoutNumber: string;
  status: string;
  dateIssued: string;
  proName: string;
  proId: string;
  proEmail: string;
  transferMethod: string;
  transferReference: string;
  transferDate: string;
  expectedDelivery: string;
  currency: string;
  grossEarnings: number;
  platformCommission: number;
  refundAdjustments: number;
  finalPayout: number;
  lineItems: PayoutReceiptLineItem[];
  adminNotes?: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** Builds receipt data from stored, immutable payment records — never from current platform_settings. */
export function buildPayoutReceiptData(params: {
  receiptNumber: string;
  payoutNumber: string;
  transferMethod: string;
  transferReference: string;
  transferDate: string;
  expectedDelivery: string;
  currency: string;
  finalPayout: number;
  adminNotes?: string | null;
  payments: Payment[];
  serviceByBooking: Record<string, string>;
  pro: { name: string; id: string; email: string };
}): PayoutReceiptData {
  const { payments, serviceByBooking, pro } = params;

  const grossEarnings = payments.reduce((s, p) => s + (p.base_amount ?? 0), 0);
  const platformCommission = payments.reduce((s, p) => s + (p.platform_commission_amount ?? 0), 0);
  // The actual dollar amount refunded to clients (payment.refunded_amount) —
  // not just refund_commission, which is only ever set on a FULL refund (the
  // commission the platform forfeited) and stays null/0 for a partial
  // refund even though real money still came off the pro's payout. Summing
  // refunded_amount instead means this line agrees with the per-booking
  // "Refunded" column in the Included Bookings / Orders table below.
  const refundAdjustments = payments.reduce((s, p) => s + (p.refunded_amount ?? 0), 0);

  const lineItems: PayoutReceiptLineItem[] = payments.map((p) => ({
    ref: p.booking_id ? `BK-${p.booking_id.slice(0, 8).toUpperCase()}` : `ORD-${p.order_id}`,
    service: p.booking_id ? (serviceByBooking[p.booking_id] ?? "Booking") : `Order #${p.order_id}`,
    date: formatDate(p.created_at),
    gross: p.base_amount ?? 0,
    commission: p.platform_commission_amount ?? 0,
    net: p.actual_payout_amount ?? p.estimated_payout_amount ?? 0,
    refunded: p.refunded_amount ?? 0,
  }));

  return {
    receiptNumber: params.receiptNumber,
    payoutNumber: params.payoutNumber,
    status: "Completed",
    dateIssued: formatDate(new Date().toISOString()),
    proName: pro.name,
    proId: pro.id,
    proEmail: pro.email,
    transferMethod: params.transferMethod,
    transferReference: params.transferReference,
    transferDate: formatDate(params.transferDate),
    expectedDelivery: params.expectedDelivery,
    currency: params.currency,
    grossEarnings,
    platformCommission,
    refundAdjustments,
    finalPayout: params.finalPayout,
    lineItems,
    adminNotes: params.adminNotes,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function money(currency: string, amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

const MARGIN = 14;
const PAGE_WIDTH = 210; // A4 mm
const BRAND_NAME = "Capture Connect - TradeHub Marketplace";

// Orange / black / white theme.
const ORANGE: [number, number, number] = [217, 119, 6];
const ORANGE_LIGHT: [number, number, number] = [255, 247, 237];
const BLACK: [number, number, number] = [17, 17, 17];

/** Renders the full TradeHub Official Payout Receipt as a PDF Blob. Never includes any client data. */
export async function generatePayoutReceiptPdf(data: PayoutReceiptData): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 18;

  // ── Header ──────────────────────────────────────────────────────────
  try {
    const logo = await loadImage(logoImg);
    const logoW = 20;
    const logoH = (logo.height / logo.width) * logoW;
    doc.addImage(logo, "PNG", PAGE_WIDTH / 2 - logoW / 2, y, logoW, logoH);
    y += logoH + 6;
  } catch {
    y += 4;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...BLACK);
  doc.text(BRAND_NAME, PAGE_WIDTH / 2, y, { align: "center" });
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...ORANGE);
  doc.text("Official Payout Receipt", PAGE_WIDTH / 2, y, { align: "center" });
  doc.setTextColor(0);
  y += 14;

  const sectionTitle = (title: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BLACK);
    doc.text(title, MARGIN, y);
    doc.setDrawColor(...ORANGE);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, y + 1.5, PAGE_WIDTH - MARGIN, y + 1.5);
    doc.setLineWidth(0.2);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
  };

  const kvRow = (label: string, value: string, xOffset = 0) => {
    doc.setTextColor(120);
    doc.text(label, MARGIN + xOffset, y);
    doc.setTextColor(...BLACK);
    doc.text(value, MARGIN + xOffset, y + 5);
  };

  // ── Receipt Information ────────────────────────────────────────────
  sectionTitle("Receipt Information");
  kvRow("Receipt Number", data.receiptNumber, 0);
  kvRow("Payout ID", data.payoutNumber, 95);
  y += 11;
  kvRow("Status", data.status, 0);
  kvRow("Date Issued", data.dateIssued, 95);
  y += 16;

  // ── Professional Information (no client data) ─────────────────────
  sectionTitle("Professional Information");
  kvRow("Professional Name", data.proName, 0);
  kvRow("Professional ID", data.proId, 95);
  y += 11;
  kvRow("Email Address", data.proEmail, 0);
  y += 16;

  // ── Payout Information ─────────────────────────────────────────────
  sectionTitle("Payout Information");
  kvRow("Transfer Method", data.transferMethod, 0);
  kvRow("Transfer Reference", data.transferReference || "—", 95);
  y += 11;
  kvRow("Transfer Date", data.transferDate, 0);
  kvRow("Expected Delivery", data.expectedDelivery || "—", 95);
  y += 11;
  kvRow("Currency", data.currency, 0);
  y += 16;

  // ── Earnings Summary ────────────────────────────────────────────────
  sectionTitle("Earnings Summary");
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Description", "Amount"]],
    body: [
      ["Gross Earnings", money(data.currency, data.grossEarnings)],
      ["Platform Commission", `-${money(data.currency, data.platformCommission)}`],
      ["Refund Adjustments", `-${money(data.currency, data.refundAdjustments)}`],
      ["Final Payout Sent", money(data.currency, data.finalPayout)],
    ],
    theme: "grid",
    headStyles: { fillColor: ORANGE, textColor: [255, 255, 255] },
    columnStyles: { 1: { halign: "right" } },
    styles: { fontSize: 10, textColor: BLACK, lineColor: [230, 230, 230] },
  });
  y = (doc as any).lastAutoTable.finalY + 14;

  // ── Included Bookings / Orders (no client data) ─────────────────────
  // A "Refunded" column is only added when at least one line item actually
  // carries a refund — otherwise every receipt would show a column of "—"
  // for a scenario that essentially never applies.
  const hasRefunds = data.lineItems.some((li) => li.refunded > 0);
  sectionTitle("Included Bookings / Orders");
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [
      hasRefunds
        ? ["Booking / Order", "Service", "Completion Date", "Gross Amount", "Refunded", "Platform Commission", "Net Earnings"]
        : ["Booking / Order", "Service", "Completion Date", "Gross Amount", "Platform Commission", "Net Earnings"],
    ],
    body: data.lineItems.map((li) =>
      hasRefunds
        ? [
            li.ref,
            li.service,
            li.date,
            money(data.currency, li.gross),
            li.refunded > 0 ? `-${money(data.currency, li.refunded)}` : "—",
            money(data.currency, li.commission),
            money(data.currency, li.net),
          ]
        : [
            li.ref,
            li.service,
            li.date,
            money(data.currency, li.gross),
            money(data.currency, li.commission),
            money(data.currency, li.net),
          ],
    ),
    theme: "grid",
    headStyles: { fillColor: ORANGE, textColor: [255, 255, 255] },
    columnStyles: hasRefunds
      ? { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } }
      : { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
    styles: { fontSize: 9, textColor: BLACK, lineColor: [230, 230, 230] },
  });
  y = (doc as any).lastAutoTable.finalY + 14;

  if (y > 235) {
    doc.addPage();
    y = 20;
  }

  // ── Platform Summary ──────────────────────────────────────────────
  sectionTitle("Platform Summary");
  kvRow("Gross Earnings", money(data.currency, data.grossEarnings), 0);
  kvRow("Platform Commission", money(data.currency, data.platformCommission), 95);
  y += 11;
  kvRow("Refund Adjustments", money(data.currency, data.refundAdjustments), 0);
  kvRow("Stripe Processing Fee", "Paid by Capture Connect - TradeHub Marketplace", 95);
  y += 11;
  kvRow("Net Payout Sent", money(data.currency, data.finalPayout), 0);
  y += 18;

  // ── Transfer Status ──────────────────────────────────────────────
  doc.setFillColor(...ORANGE_LIGHT);
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.4);
  doc.roundedRect(MARGIN, y - 5, PAGE_WIDTH - MARGIN * 2, 16, 2, 2, "FD");
  doc.setLineWidth(0.2);
  doc.setTextColor(...ORANGE);
  doc.setFont("helvetica", "bold");
  doc.text("✔ Transfer Submitted", MARGIN + 4, y + 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text(
    "Your payout has been released and submitted using the selected transfer method.",
    MARGIN + 4,
    y + 7,
  );
  doc.setTextColor(0);
  doc.setFontSize(10);
  y += 24;

  if (y > 245) {
    doc.addPage();
    y = 20;
  }

  // ── Administrator Notes (optional) ──────────────────────────────────
  if (data.adminNotes && data.adminNotes.trim().length > 0) {
    sectionTitle("Administrator Notes");
    const lines = doc.splitTextToSize(data.adminNotes, PAGE_WIDTH - MARGIN * 2);
    doc.text(lines, MARGIN, y);
    y += lines.length * 5 + 12;
  }

  if (y > 235) {
    doc.addPage();
    y = 20;
  }

  // ── Support ──────────────────────────────────────────────────────
  sectionTitle("Need Help?");
  const supportLines = doc.splitTextToSize(
    "If you have not received your payout by the expected delivery date:\n" +
      "• Verify your banking or transfer information.\n" +
      "• Contact the financial institution or transfer provider using your transfer reference number.\n" +
      "• If you still require assistance, contact the TradeHub Support Team and include your Receipt Number and Payout ID.",
    PAGE_WIDTH - MARGIN * 2,
  );
  doc.text(supportLines, MARGIN, y);
  y += supportLines.length * 5 + 10;

  // ── Footer ──────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...ORANGE);
    doc.text(BRAND_NAME, PAGE_WIDTH / 2, 285, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(
      "This receipt was generated electronically and does not require a signature.",
      PAGE_WIDTH / 2,
      290,
      { align: "center" },
    );
  }

  return doc.output("blob");
}

export function pdfBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
