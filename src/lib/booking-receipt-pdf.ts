/**
 * Client-side PDF receipt generation for bookings.
 * Uses jspdf for itemized bill output (tax/accounting).
 */

import { jsPDF } from "jspdf";

interface BookingAddOn {
  name: string;
  category: string;
  quantity: number;
  unitPrice: string | number;
  totalPrice: string | number;
  currency: string;
}

interface BookingReceiptData {
  bookingNumber: string;
  bookingType: string;
  bookingDate: string;
  startTime: string;
  venue: string;
  member: string;
  table?: string;
  ticket?: string;
  guestCount: number;
  baseAmount: number;
  addOnsAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  addOns: BookingAddOn[];
  /** Package inclusions (free items from table/ticket) */
  packageInclusions?: string[];
  /** Platform fee (2.5% software service) */
  platformFee?: number;
  /** Promoter commission (when promoter has code) */
  promoterEarning?: number;
  /** Platform commission (when platform acts as promoter) */
  platformPassive?: number;
  paymentStatus?: string;
  paymentProcessedAt?: string;
  stripeChargeId?: string;
}

function formatAmount(amount: number, currency: string): string {
  const noSubunit = ["IDR", "JPY", "KRW", "VND"].includes(currency.toUpperCase());
  const value = noSubunit ? amount : amount / 100;
  return `${currency} ${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: noSubunit ? 0 : 2,
  })}`;
}

export function generateBookingReceiptPdf(data: BookingReceiptData): void {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("PRESTIX.VIP", 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Itemized Receipt — For Tax & Accounting", 20, y);
  y += 12;

  // Booking info
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Booking: ${data.bookingNumber}`, 20, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Type: ${data.bookingType === "EVENT_TICKET" ? "Event Ticket" : "Table Reservation"}`, 20, y);
  doc.text(`Date: ${new Date(data.bookingDate).toLocaleDateString()} ${data.startTime}`, 100, y);
  y += 6;
  doc.text(`Venue: ${data.venue}`, 20, y);
  doc.text(`Guest(s): ${data.guestCount}`, 100, y);
  y += 6;
  doc.text(`Member: ${data.member}`, 20, y);
  if (data.table) doc.text(`Table: ${data.table}`, 100, y);
  if (data.ticket) doc.text(`Ticket: ${data.ticket}`, 100, y);
  y += 12;

  // Line items table
  doc.setFont("helvetica", "bold");
  doc.text("Item", 20, y);
  doc.text("Qty", 100, y);
  doc.text("Unit Price", 120, y);
  doc.text("Amount", 160, y);
  y += 6;

  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, pageWidth - 20, y);
  y += 6;

  doc.setFont("helvetica", "normal");

  // Base item
  const baseLabel = data.bookingType === "EVENT_TICKET" ? "Event Ticket" : "Table Reservation";
  doc.text(baseLabel, 20, y);
  doc.text("1", 100, y);
  doc.text(formatAmount(data.baseAmount, data.currency), 120, y);
  doc.text(formatAmount(data.baseAmount, data.currency), 160, y);
  y += 6;

  // Package inclusions (free)
  const inclusions = data.packageInclusions ?? [];
  for (const item of inclusions) {
    doc.text(`${item} (included)`, 20, y);
    doc.text("—", 160, y);
    y += 6;
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
  }

  // Additional purchases (add-ons)
  for (const addOn of data.addOns) {
    doc.text(addOn.name, 20, y);
    doc.text(String(addOn.quantity), 100, y);
    doc.text(formatAmount(Number(addOn.unitPrice), addOn.currency), 120, y);
    doc.text(formatAmount(Number(addOn.totalPrice), addOn.currency), 160, y);
    y += 6;
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
  }

  y += 4;
  doc.line(20, y, pageWidth - 20, y);
  y += 8;

  // Totals
  if (data.addOnsAmount > 0) {
    doc.text("Additional purchases subtotal:", 120, y);
    doc.text(formatAmount(data.addOnsAmount, data.currency), 160, y);
    y += 6;
  }
  if (data.discountAmount > 0) {
    doc.text("Discount:", 120, y);
    doc.text(`-${formatAmount(data.discountAmount, data.currency)}`, 160, y);
    y += 6;
  }
  if (data.taxAmount > 0) {
    doc.text("Tax:", 120, y);
    doc.text(formatAmount(data.taxAmount, data.currency), 160, y);
    y += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.text("Total:", 120, y + 4);
  doc.text(formatAmount(data.totalAmount, data.currency), 160, y + 4);
  y += 14;

  // Fee attribution (SPV accounting: software service fee, promoter commission, platform commission)
  const platformFee = data.platformFee ?? 0;
  const promoterEarning = data.promoterEarning ?? 0;
  const platformPassive = data.platformPassive ?? 0;
  if (platformFee > 0 || promoterEarning > 0 || platformPassive > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Fee attribution:", 20, y);
    y += 6;
    const total = data.totalAmount;
    const pct = (amt: number) => total > 0 ? ((amt / total) * 100).toFixed(1) : "—";
    if (platformFee > 0) {
      doc.text(`Platform Fee (Software Service) (${pct(platformFee)}%):`, 20, y);
      doc.text(formatAmount(platformFee, data.currency), 160, y);
      y += 5;
    }
    if (promoterEarning > 0) {
      doc.text(`Promoter Commission (${pct(promoterEarning)}%):`, 20, y);
      doc.text(formatAmount(promoterEarning, data.currency), 160, y);
      y += 5;
    }
    if (platformPassive > 0) {
      doc.text(`Platform Commission (${pct(platformPassive)}%):`, 20, y);
      doc.text(formatAmount(platformPassive, data.currency), 160, y);
      y += 5;
    }
    y += 6;
  }

  // Payment info
  if (data.paymentStatus || data.paymentProcessedAt || data.stripeChargeId) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Payment:", 20, y);
    if (data.paymentStatus) doc.text(`Status: ${data.paymentStatus}`, 20, y + 5);
    if (data.paymentProcessedAt) doc.text(`Processed: ${new Date(data.paymentProcessedAt).toLocaleString()}`, 20, y + 10);
    if (data.stripeChargeId) doc.text(`Transaction ID: ${data.stripeChargeId}`, 20, y + 15);
    y += 22;
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    "This receipt is for your records. For tax or accounting purposes, retain this document.",
    20,
    doc.internal.pageSize.getHeight() - 15
  );
  doc.text(`Generated: ${new Date().toISOString()}`, 20, doc.internal.pageSize.getHeight() - 10);

  doc.save(`receipt-${data.bookingNumber}.pdf`);
}
