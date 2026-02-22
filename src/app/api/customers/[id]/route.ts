import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validation";
import { getSessionOrThrow } from "@/lib/session";
import { ensureAdmin } from "@/lib/permissions";
import { pushCustomerToQBO } from "@/lib/quickbooks/push";

interface Params {
  params: { id: string };
}

export async function PUT(request: Request, { params }: Params) {
  const session = await getSessionOrThrow();
  ensureAdmin(session.user.role as any);

  const body = await request.json();
  const parsed = customerSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const customer = await prisma.customer.update({
    where: { id: params.id },
    data: parsed.data,
  });

  // Auto-push update to QBO if connected and customer is linked
  if (customer.qbCustomerId) {
    pushCustomerToQBO(customer.id).catch((err) =>
      console.error("[QBO Push] Auto-push customer update failed:", err.message)
    );
  }

  return NextResponse.json(customer);
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSessionOrThrow();
  ensureAdmin(session.user.role as any);

  const body = await request.json();
  const parsed = customerSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const customer = await prisma.customer.update({
    where: { id: params.id },
    data: parsed.data,
  });

  // Auto-push update to QBO if connected and customer is linked
  if (customer.qbCustomerId) {
    pushCustomerToQBO(customer.id).catch((err) =>
      console.error("[QBO Push] Auto-push customer update failed:", err.message)
    );
  }

  return NextResponse.json(customer);
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await getSessionOrThrow();
  ensureAdmin(session.user.role as any);

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: { 
      jobs: true,
      invoices: true,
      recurringInvoices: true,
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  if (customer.jobs.length > 0 || customer.invoices.length > 0 || customer.recurringInvoices.length > 0) {
    return NextResponse.json({ 
      error: "Cannot delete customer with existing jobs, invoices, or recurring invoices. Please delete those first." 
    }, { status: 400 });
  }

  // Note: QBO-synced customers should be deactivated in QBO, not deleted from the app.
  // If this customer was synced from QBO, it will reappear on next sync.
  await prisma.customer.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
