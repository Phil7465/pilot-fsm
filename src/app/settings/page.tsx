import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CompanyForm } from "@/components/settings/company-form";
import { PaymentProviderForm } from "@/components/settings/payment-provider-form";
import { AppearanceForm } from "@/components/settings/appearance-form";
import { PWAInstallCard } from "@/components/settings/pwa-install-card";
import { ThemeDebug } from "@/components/settings/theme-debug";
import Link from "next/link";
import type { PaymentProviderSetting } from "@prisma/client";

type PaymentSettingsDefaults = {
  activeProvider?: "stripe" | "gocardless";
  stripeSecret?: string;
  stripeWebhookSecret?: string;
  gocardlessAccessToken?: string;
};

function normalizePaymentDefaults(setting: PaymentProviderSetting | null): PaymentSettingsDefaults | undefined {
  if (!setting) return undefined;

  return {
    activeProvider: setting.activeProvider === "gocardless" ? "gocardless" : "stripe",
    stripeSecret: setting.stripeSecret ?? undefined,
    stripeWebhookSecret: setting.stripeWebhookSecret ?? undefined,
    gocardlessAccessToken: setting.gocardlessAccessToken ?? undefined,
  };
}

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/api/auth/signin");
  }
  
  const [company, paymentProvider] = await Promise.all([
    prisma.globalSetting.findFirst(),
    prisma.paymentProviderSetting.findFirst(),
  ]);
  const paymentDefaults = normalizePaymentDefaults(paymentProvider);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-slate-500">Configuration</p>
        <h1 className="text-3xl font-semibold text-slate-900">Settings</h1>
      </div>
      <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <CompanyForm defaults={company ?? undefined} />
        <PaymentProviderForm defaults={paymentDefaults} />
        <AppearanceForm />
        <ThemeDebug />
      </div>
      
      {/* PWA Installation Section */}
      <div className="mt-8">
        <PWAInstallCard />
      </div>

      {/* Admin Tools */}
      {session.user.role === "ADMIN" && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Admin Tools</h2>
          <Link
            href="/settings/logs"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <svg
              className="h-5 w-5 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            View Error Logs (Mobile Debugging)
          </Link>
        </div>
      )}
    </div>
  );
}
