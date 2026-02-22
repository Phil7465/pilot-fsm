"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { invoiceSchema, type InvoiceInput } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { calculateInvoiceTotals } from "@/lib/finance";
import { useRouter } from "next/navigation";

export function InvoiceBuilder({
  customers,
  jobs,
  services,
  isVatRegistered,
}: {
  customers: { id: string; name: string }[];
  jobs: { id: string; reference: string }[];
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    unitPrice: any;
    vatCode: string;
    incomeAccount: string;
  }>;
  isVatRegistered: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    register,
    watch,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: customers[0]?.id,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      lineItems: [],
    } as any,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });
  const values = watch();
  const totals = useMemo(() => calculateInvoiceTotals(values, isVatRegistered), [values, isVatRegistered]);

  async function onSubmit(data: InvoiceInput) {
    setError(null);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      console.error("[Invoice] Server error:", errData);
      setError(errData?.error ? JSON.stringify(errData.error) : "Failed to generate invoice");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Invoice builder</h2>
        <p className="text-sm text-slate-500">Amounts auto-calc from line items.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Customer</label>
          <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("customerId")}>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Job (optional)</label>
          <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("jobId")}
            defaultValue=""
          >
            <option value="">No job link</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.reference}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Issue date</label>
          <input type="date" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("issueDate")} />
        </div>
        <div>
          <label className="text-sm font-medium">Due date</label>
          <input type="date" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("dueDate")} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Line items</p>
          <div className="flex items-center gap-2">
            <select
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
              onChange={(e) => {
                if (e.target.value) {
                  const service = services.find(s => s.id === e.target.value);
                  if (service) {
                    append({
                      description: service.name,
                      quantity: 1,
                      unitPrice: parseFloat(service.unitPrice.toString()),
                      vatCode: service.vatCode as any,
                      incomeAccount: service.incomeAccount,
                    } as any);
                    e.target.value = "";
                  }
                }
              }}
            >
              <option value="">+ Add from service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - £{Number(service.unitPrice).toFixed(2)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                append({
                  description: "",
                  quantity: 1,
                  unitPrice: 0,
                  vatCode: "STANDARD",
                  incomeAccount: "4000",
                } as any)
              }
              className="text-sm text-brand-600"
            >
              + Manual item
            </button>
          </div>
        </div>
        {fields.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
            No line items yet — add a service from the dropdown above
          </p>
        )}
        {fields.map((field, index) => (
          <div key={field.id} className="grid gap-3 rounded-2xl border border-slate-200 p-3 md:grid-cols-5">
            <input placeholder="Description" className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" {...register(`lineItems.${index}.description` as const)} />
            <input type="number" step="1" className="rounded-xl border border-slate-200 px-3 py-2" {...register(`lineItems.${index}.quantity` as const, { valueAsNumber: true })} />
            <input type="number" step="0.01" className="rounded-xl border border-slate-200 px-3 py-2" {...register(`lineItems.${index}.unitPrice` as const, { valueAsNumber: true })} />
            <select className="rounded-xl border border-slate-200 px-3 py-2" {...register(`lineItems.${index}.vatCode` as const)}>
              <option value="STANDARD">20%</option>
              <option value="REDUCED">5%</option>
              <option value="ZERO">0%</option>
              <option value="EXEMPT">Exempt</option>
            </select>
            <input type="hidden" {...register(`lineItems.${index}.incomeAccount` as const)} />
            <button type="button" onClick={() => remove(index)} className="text-xs text-red-500">
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-slate-50 p-4 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>£{totals.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>VAT</span>
          <span>£{totals.vatTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span>£{totals.total.toFixed(2)}</span>
        </div>
        <p className="mt-2 text-xs text-slate-500">Amount field is read-only and derived automatically.</p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {errors.lineItems && <p className="text-sm text-red-500">Please add at least one line item</p>}
      {errors.customerId && <p className="text-sm text-red-500">Please select a customer</p>}
      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        Generate invoice
      </button>
    </form>
  );
}
