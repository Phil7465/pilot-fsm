"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

interface FormValues {
  companyName: string;
  companyNameSize: string;
  companyNameWeight: string;
  isVatRegistered: boolean;
  defaultCurrency: string;
  defaultNetTerms: number;
}

export function CompanyForm({ defaults }: { defaults?: Partial<FormValues> }) {
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm<FormValues>({
    defaultValues: {
      companyName: defaults?.companyName ?? "Pilot Field Service Pro",
      companyNameSize: defaults?.companyNameSize ?? "text-xl",
      companyNameWeight: defaults?.companyNameWeight ?? "font-semibold",
      isVatRegistered: defaults?.isVatRegistered ?? true,
      defaultCurrency: defaults?.defaultCurrency ?? "GBP",
      defaultNetTerms: defaults?.defaultNetTerms ?? 14,
    },
  });

  async function onSubmit(values: FormValues) {
    await fetch("/api/settings/company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Company settings</h2>
        <p className="text-sm text-slate-500">Company name, VAT registration and defaults.</p>
      </div>
      <div>
        <label className="text-sm font-medium">Company name</label>
        <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("companyName")} placeholder="Your Company Name" />
        <div className="mt-2 flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-slate-500">Font size</label>
            <select className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" {...register("companyNameSize")}>
              <option value="text-sm">Small</option>
              <option value="text-base">Medium</option>
              <option value="text-lg">Large</option>
              <option value="text-xl">Extra Large</option>
              <option value="text-2xl">2X Large</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-500">Font weight</label>
            <select className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" {...register("companyNameWeight")}>
              <option value="font-normal">Regular</option>
              <option value="font-medium">Medium</option>
              <option value="font-semibold">Semibold</option>
              <option value="font-bold">Bold</option>
            </select>
          </div>
        </div>
      </div>
      <label className="flex items-center gap-3 text-sm text-slate-700">
        <input type="checkbox" {...register("isVatRegistered")} className="h-4 w-4" />
        Company is VAT registered
      </label>
      <div>
        <label className="text-sm font-medium">Default currency</label>
        <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("defaultCurrency")} />
      </div>
      <div>
        <label className="text-sm font-medium">Default net terms (days)</label>
        <input type="number" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("defaultNetTerms", { valueAsNumber: true })} />
      </div>
      <button type="submit" className="btn-primary" disabled={formState.isSubmitting}>
        Save settings
      </button>
    </form>
  );
}
