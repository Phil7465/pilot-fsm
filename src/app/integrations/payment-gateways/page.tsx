import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PaymentGatewayForm } from "@/components/integrations/payment-gateway-form";

export const dynamic = "force-dynamic";

export default async function PaymentGatewaysPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const settings = await prisma.paymentProviderSetting.findFirst();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payment Gateways</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure payment providers to accept online payments from customers.
        </p>
      </div>

      <div className="card space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-xl font-bold text-indigo-600">
            S
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Stripe</h2>
            <p className="text-sm text-slate-500">
              Accept credit cards, debit cards, and digital wallets
            </p>
          </div>
          <div
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              settings?.stripeSecret
                ? "bg-green-100 text-green-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {settings?.stripeSecret
              ? "Configured"
              : "Not Configured"}
          </div>
        </div>

        <PaymentGatewayForm
          provider="STRIPE"
          existingSettings={settings}
        />
      </div>

      <div className="card space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-xl font-bold text-blue-600">
            GC
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">GoCardless</h2>
            <p className="text-sm text-slate-500">
              Accept direct debit payments and recurring subscriptions
            </p>
          </div>
          <div
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              settings?.gocardlessAccessToken
                ? "bg-green-100 text-green-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {settings?.gocardlessAccessToken
              ? "Configured"
              : "Not Configured"}
          </div>
        </div>

        <PaymentGatewayForm
          provider="GOCARDLESS"
          existingSettings={settings}
        />
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <h3 className="font-semibold text-blue-900">📘 Getting Started</h3>
        <ul className="mt-2 space-y-1 text-sm text-blue-700">
          <li>
            • <strong>Stripe:</strong> Get your API keys from{" "}
            <a
              href="https://dashboard.stripe.com/apikeys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Stripe Dashboard
            </a>
          </li>
          <li>
            • <strong>GoCardless:</strong> Create an access token from{" "}
            <a
              href="https://manage.gocardless.com/developers"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              GoCardless Developers
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
