import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrThrow } from "@/lib/session";
import { ensureAdmin } from "@/lib/permissions";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET() {
  const session = await getSessionOrThrow();
  ensureAdmin(session.user.role as any);
  const recurring = await prisma.recurringInvoice.findMany({ include: { customer: true, lineItems: true } });
  return NextResponse.json(recurring);
}

export async function POST(request: Request) {
  const session = await getSessionOrThrow();
  ensureAdmin(session.user.role as any);
  const body = await request.json();

  const recurring = await prisma.recurringInvoice.create({
    data: {
      customerId: body.customerId,
      startDate: new Date(body.startDate),
      nextRunDate: new Date(body.nextRunDate),
      interval: body.interval ?? "MONTHLY",
      lineItems: {
        create: body.lineItems.map((item: any) => ({
          description: item.description,
          quantity: new Decimal(item.quantity),
          unitPrice: new Decimal(item.unitPrice),
          vatCode: item.vatCode,
          incomeAccount: item.incomeAccount,
        })),
      },
    },
    include: { lineItems: true },
  });

  return NextResponse.json(recurring, { status: 201 });
}
