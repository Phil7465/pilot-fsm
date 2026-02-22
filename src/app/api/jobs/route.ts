import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jobSchema } from "@/lib/validation";
import { getSessionOrThrow } from "@/lib/session";
import { ensureDriverOrAdmin } from "@/lib/permissions";
import { Decimal } from "@prisma/client/runtime/library";

function generateJobReference() {
  return `JOB-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export async function GET() {
  const session = await getSessionOrThrow();
  ensureDriverOrAdmin(session.user.role as any);

  const jobs = await prisma.job.findMany({
    include: { customer: true, lineItems: true },
    orderBy: { serviceDate: "asc" },
  });

  return NextResponse.json(jobs);
}

export async function POST(request: Request) {
  const session = await getSessionOrThrow();
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can create jobs" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = jobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const job = await prisma.job.create({
    data: {
      reference: generateJobReference(),
      customerId: parsed.data.customerId,
      deliveryAddress: parsed.data.deliveryAddress,
      invoiceAddress: parsed.data.invoiceAddress ?? undefined,
      serviceDate: new Date(parsed.data.serviceDate),
      assignedStaffId: parsed.data.assignedStaffId ?? undefined,
      status: parsed.data.status,
      notes: parsed.data.notes,
      createdById: session.user.id,
      lineItems: {
        create: parsed.data.lineItems.map((item) => ({
          serviceTemplateId: item.serviceTemplateId ?? undefined,
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

  return NextResponse.json(job, { status: 201 });
}
