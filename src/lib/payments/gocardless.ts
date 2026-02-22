import GoCardless from "gocardless-nodejs";
import { PaymentIntentPayload, PaymentIntentResponse, PaymentProvider } from "./base";

type MandateResult = { mandateId: string };
const createGoCardlessClient = GoCardless as unknown as (token: string, environment: string) => any;

export class GoCardlessProvider implements PaymentProvider {
  private client: any;

  constructor(accessToken = process.env.GOCARDLESS_ACCESS_TOKEN, environment = process.env.GOCARDLESS_ENV || "sandbox") {
    if (!accessToken) throw new Error("GOCARDLESS_ACCESS_TOKEN is not configured");
    this.client = createGoCardlessClient(accessToken, environment);
  }

  async createPaymentIntent(payload: PaymentIntentPayload): Promise<PaymentIntentResponse> {
    const payment = await this.client!.payments.create({
      amount: Math.round(payload.amount * 100),
      currency: payload.currency,
      reference: payload.metadata?.reference,
      description: payload.description,
      links: {
        mandate: payload.metadata?.mandateId,
      },
    });

    return {
      id: payment.id,
      status: payment.status,
      provider: "gocardless",
    };
  }

  async createCustomerMandate(data: { customerName: string; email: string }): Promise<MandateResult> {
    const customer = await this.client!.customers.create({
      email: data.email,
      given_name: data.customerName,
    });

    const mandate = await this.client!.mandates.create({
      scheme: "bacs",
      links: { customer: customer.id },
    });

    return { mandateId: mandate.id };
  }
}
