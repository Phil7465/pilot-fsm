import type { PaymentMethod } from "@prisma/client";

type PaymentWithInvoice = {
  id: string;
  invoice: { number: string };
  amount: number;
  paymentDate: string | Date;
  method: PaymentMethod;
  reference?: string | null;
};

export function PaymentList({ payments }: { payments: PaymentWithInvoice[] }) {
  return (
    <div className="card space-y-3">
      {payments.map((payment) => (
        <div key={payment.id} className="rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">{payment.invoice.number}</p>
            <p className="text-sm text-slate-500">{new Date(payment.paymentDate).toLocaleDateString()}</p>
          </div>
          <p className="text-lg font-semibold text-slate-900">£{payment.amount.toFixed(2)}</p>
          <p className="text-xs uppercase tracking-wide text-slate-500">{payment.method}</p>
          {payment.reference && <p className="text-xs text-slate-400">Ref: {payment.reference}</p>}
        </div>
      ))}
    </div>
  );
}
