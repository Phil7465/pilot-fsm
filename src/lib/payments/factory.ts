import { PaymentProvider } from "./base";
import { StripeProvider } from "./stripe";
import { GoCardlessProvider } from "./gocardless";
import { prisma } from "@/lib/prisma";

export async function getPaymentProvider(): Promise<PaymentProvider> {
  const settings = await prisma.paymentProviderSetting.findFirst();
  const provider = settings?.activeProvider ?? "stripe";

  if (provider === "gocardless") {
    return new GoCardlessProvider(settings?.gocardlessAccessToken ?? process.env.GOCARDLESS_ACCESS_TOKEN ?? undefined);
  }
  return new StripeProvider(settings?.stripeSecret ?? process.env.STRIPE_SECRET_KEY ?? undefined);
}
