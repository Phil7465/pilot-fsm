import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrThrow } from "@/lib/session";
import { ensureAdmin } from "@/lib/permissions";

export async function GET() {
  const session = await getSessionOrThrow();
  ensureAdmin(session.user.role as any);

  const [payments, invoices] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.invoice.aggregate({
      _sum: { total: true, balanceDue: true },
    }),
  ]);

  const outstandingInvoices = await prisma.invoice.findMany({
    where: { balanceDue: { gt: 0 } },
    select: { id: true, number: true, balanceDue: true, customer: { select: { name: true } } },
  });

  return NextResponse.json({
    revenue: Number(payments._sum.amount ?? 0),
    totalInvoiced: Number(invoices._sum.total ?? 0),
    outstanding: Number(invoices._sum.balanceDue ?? 0),
    outstandingInvoices,
  });
}
