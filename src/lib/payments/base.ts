export type PaymentIntentPayload = {
  amount: number;
  currency: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, string>;
};

export type PaymentIntentResponse = {
  id: string;
  clientSecret?: string;
  status: string;
  provider: "stripe" | "gocardless";
};

export interface PaymentProvider {
  createPaymentIntent(payload: PaymentIntentPayload): Promise<PaymentIntentResponse>;
  capturePayment?(paymentId: string): Promise<void>;
  createCustomerMandate?(data: { customerName: string; email: string }): Promise<{ mandateId: string }>;
}
