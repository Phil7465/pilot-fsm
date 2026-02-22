import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrThrow } from "@/lib/session";
import { calculateInvoiceTotals } from "@/lib/finance";
import { ensureAdmin } from "@/lib/permissions";
import { Decimal } from "@prisma/client/runtime/library";

interface Params {
  params: { id: string };
}

export async function POST(request: Request, { params }: Params) {
  const session = await getSessionOrThrow();
  ensureAdmin(session.user.role as any);

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: { customer: true, lineItems: true },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const lineItems = job.lineItems.map((line) => ({
    description: line.description,
    quantity: Number(line.quantity),
    unitPrice: Number(line.unitPrice),
    vatCode: line.vatCode,
    incomeAccount: line.incomeAccount,
  }));

  const totals = calculateInvoiceTotals(
    {
      customerId: job.customerId,
      jobId: job.id,
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
      lineItems,
    },
    true
  );

  const invoice = await prisma.invoice.create({
    data: {
      number: `INV-${job.reference}`,
      customerId: job.customerId,
      jobId: job.id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      subtotal: new Decimal(totals.subtotal),
      vatTotal: new Decimal(totals.vatTotal),
      total: new Decimal(totals.total),
      balanceDue: new Decimal(totals.total),
      status: "DRAFT",
      createdById: session.user.id,
      lineItems: {
        create: job.lineItems.map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          vatCode: line.vatCode,
          incomeAccount: line.incomeAccount,
          total: new Decimal(Number(line.quantity) * Number(line.unitPrice)),
        })),
      },
    },
    include: { lineItems: true },
  });

  return NextResponse.json(invoice, { status: 201 });
}
