import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PaymentForm } from "@/components/payments/payment-form";
import { PaymentList } from "@/components/payments/payment-list";
import type { PaymentMethod } from "@prisma/client";

export default async function PaymentsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/api/auth/signin");
  }
  
  const [payments, invoices] = await Promise.all([
    prisma.payment.findMany({ include: { invoice: { select: { number: true } } }, orderBy: { paymentDate: "desc" } }),
    prisma.invoice.findMany({ select: { id: true, number: true, balanceDue: true }, orderBy: { issueDate: "desc" } }),
  ]);

  type PaymentListItem = {
    id: string;
    invoice: { number: string };
    amount: number;
    paymentDate: string;
    method: PaymentMethod;
    reference?: string | null;
  };

  const paymentsSafe: PaymentListItem[] = payments.map((payment) => ({
    id: payment.id,
    invoice: payment.invoice,
    amount: Number(payment.amount),
    paymentDate: payment.paymentDate.toISOString(),
    method: payment.method,
    reference: payment.reference,
  }));
  const invoiceOptions = invoices.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    balanceDue: Number(invoice.balanceDue),
  }));

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-slate-500">Payments</p>
        <h1 className="text-3xl font-semibold text-slate-900">Payments & Collections</h1>
      </div>
      <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        <PaymentList payments={paymentsSafe} />
        <PaymentForm invoices={invoiceOptions} />
      </div>
    </div>
  );
}
