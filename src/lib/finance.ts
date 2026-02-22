import type { InvoiceInput } from "@/lib/validation";

export type InvoiceTotals = {
  subtotal: number;
  vatTotal: number;
  total: number;
};

const vatRates: Record<string, number> = {
  STANDARD: 0.2,
  REDUCED: 0.05,
  ZERO: 0,
  EXEMPT: 0,
};

export function calculateInvoiceTotals(input: InvoiceInput, isVatRegistered = true): InvoiceTotals {
  const subtotal = input.lineItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  const vatTotal = isVatRegistered
    ? input.lineItems.reduce((acc, item) => acc + item.quantity * item.unitPrice * (vatRates[item.vatCode] ?? 0), 0)
    : 0;
  const total = subtotal + vatTotal;
  return {
    subtotal: Number(subtotal.toFixed(2)),
    vatTotal: Number(vatTotal.toFixed(2)),
    total: Number(total.toFixed(2)),
  };
}

export function remainingBalance(total: number, payments: number) {
  return Number(Math.max(total - payments, 0).toFixed(2));
}
