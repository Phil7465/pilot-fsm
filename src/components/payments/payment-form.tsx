"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { paymentSchema, type PaymentInput } from "@/lib/validation";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PaymentForm({ invoices }: { invoices: { id: string; number: string; balanceDue: number }[] }) {
  const defaultInvoiceId = invoices[0]?.id;
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      invoiceId: defaultInvoiceId,
      paymentDate: new Date().toISOString().slice(0, 10),
      method: "CARD",
    } as Partial<PaymentInput>,
  });

  if (invoices.length === 0) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold">Record payment</h2>
        <p className="text-sm text-slate-500">Create an invoice before logging payments.</p>
      </div>
    );
  }

  async function onSubmit(values: PaymentInput) {
    setError(null);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      setError("Failed to record payment");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Record payment</h2>
        <p className="text-sm text-slate-500">Supports partial payments.</p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Invoice</label>
        <select className="w-full rounded-xl border border-slate-200 px-3 py-2" {...register("invoiceId")}>
          {invoices.map((invoice) => (
            <option key={invoice.id} value={invoice.id}>
              {invoice.number} – balance £{invoice.balanceDue.toFixed(2)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Amount</label>
          <input type="number" step="0.01" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("amount", { valueAsNumber: true })} />
        </div>
        <div>
          <label className="text-sm font-medium">Payment date</label>
          <input type="date" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("paymentDate")} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Method</label>
          <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("method")}>
            <option value="CARD">Card</option>
            <option value="DIRECT_DEBIT">Direct debit</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="CASH">Cash</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Reference</label>
          <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("reference")}
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        Record payment
      </button>
    </form>
  );
}
