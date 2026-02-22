"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PaymentProviderSetting } from "@prisma/client";

interface Props {
  provider: "STRIPE" | "GOCARDLESS";
  existingSettings?: PaymentProviderSetting | null;
}

export function PaymentGatewayForm({ provider, existingSettings }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showFields, setShowFields] = useState(false);

  const isConfigured =
    provider === "STRIPE"
      ? !!existingSettings?.stripeSecret
      : !!existingSettings?.gocardlessAccessToken;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload: any = {};

    if (provider === "STRIPE") {
      payload.stripeSecret = formData.get("stripeSecret");
      payload.stripeWebhookSecret = formData.get("stripeWebhookSecret");
    } else if (provider === "GOCARDLESS") {
      payload.gocardlessAccessToken = formData.get("gocardlessAccessToken");
    }

    try {
      const res = await fetch("/api/settings/payment-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowFields(false);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save settings");
      }
    } catch (err) {
      console.error("Failed to save payment settings", err);
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (!showFields && isConfigured) {
    return (
      <button
        onClick={() => setShowFields(true)}
        className="text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        Update Configuration
      </button>
    );
  }

  if (!showFields) {
    return (
      <button
        onClick={() => setShowFields(true)}
        className="btn-primary"
      >
        Configure {provider === "STRIPE" ? "Stripe" : "GoCardless"}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      {provider === "STRIPE" && (
        <>
          <div>
            <label className="text-sm font-medium">Stripe Secret Key</label>
            <input
              type="password"
              name="stripeSecret"
              defaultValue={existingSettings?.stripeSecret || ""}
              placeholder="sk_test_..."
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Webhook Secret (optional)</label>
            <input
              type="password"
              name="stripeWebhookSecret"
              defaultValue={existingSettings?.stripeWebhookSecret || ""}
              placeholder="whsec_..."
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </>
      )}

      {provider === "GOCARDLESS" && (
        <div>
          <label className="text-sm font-medium">GoCardless Access Token</label>
          <input
            type="password"
            name="gocardlessAccessToken"
            defaultValue={existingSettings?.gocardlessAccessToken || ""}
            placeholder="live_..."
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? "Saving..." : "Save Configuration"}
        </button>
        <button
          type="button"
          onClick={() => setShowFields(false)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
