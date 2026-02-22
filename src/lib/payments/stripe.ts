import Stripe from "stripe";
import { PaymentIntentPayload, PaymentIntentResponse, PaymentProvider } from "./base";

export class StripeProvider implements PaymentProvider {
  private client: Stripe;

  constructor(secretKey = process.env.STRIPE_SECRET_KEY) {
    if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured");
    this.client = new Stripe(secretKey, { apiVersion: "2024-06-20" });
  }

  async createPaymentIntent(payload: PaymentIntentPayload): Promise<PaymentIntentResponse> {
    const intent = await this.client.paymentIntents.create({
      amount: Math.round(payload.amount * 100),
      currency: payload.currency,
      description: payload.description,
      customer: payload.customerId,
      metadata: payload.metadata,
      automatic_payment_methods: { enabled: true },
    });
    return {
      id: intent.id,
      clientSecret: intent.client_secret ?? undefined,
      status: intent.status,
      provider: "stripe",
    };
  }

  async capturePayment(paymentId: string) {
    await this.client.paymentIntents.capture(paymentId);
  }
}
