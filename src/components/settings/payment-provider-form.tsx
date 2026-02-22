"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

interface PaymentSettings {
  activeProvider: "stripe" | "gocardless";
  stripeSecret?: string;
  stripeWebhookSecret?: string;
  gocardlessAccessToken?: string;
}

export function PaymentProviderForm({ defaults }: { defaults?: Partial<PaymentSettings> }) {
  const router = useRouter();
  const { register, handleSubmit, watch, formState } = useForm<PaymentSettings>({
    defaultValues: {
      activeProvider: defaults?.activeProvider ?? "stripe",
      stripeSecret: defaults?.stripeSecret ?? "",
      stripeWebhookSecret: defaults?.stripeWebhookSecret ?? "",
      gocardlessAccessToken: defaults?.gocardlessAccessToken ?? "",
    },
  });

  const provider = watch("activeProvider");

  async function onSubmit(values: PaymentSettings) {
    await fetch("/api/settings/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Payment providers</h2>
        <p className="text-sm text-slate-500">Switch between Stripe and GoCardless.</p>
      </div>
      <div>
        <label className="text-sm font-medium">Active provider</label>
        <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("activeProvider")}>
          <option value="stripe">Stripe (cards)</option>
          <option value="gocardless">GoCardless (direct debit)</option>
        </select>
      </div>
      {provider === "stripe" ? (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Stripe secret key</label>
            <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("stripeSecret")} />
          </div>
          <div>
            <label className="text-sm font-medium">Stripe webhook secret</label>
            <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("stripeWebhookSecret")} />
          </div>
        </div>
      ) : (
        <div>
          <label className="text-sm font-medium">GoCardless access token</label>
          <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" {...register("gocardlessAccessToken")} />
        </div>
      )}
      <button type="submit" className="btn-primary" disabled={formState.isSubmitting}>
        Save provider
      </button>
    </form>
  );
}
