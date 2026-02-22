import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invoiceSchema } from "@/lib/validation";
import { getSessionOrThrow } from "@/lib/session";
import { calculateInvoiceTotals } from "@/lib/finance";
import { ensureDriverOrAdmin } from "@/lib/permissions";
import { Decimal } from "@prisma/client/runtime/library";
import { pushInvoiceToQBO } from "@/lib/quickbooks/push";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

function generateInvoiceNumber() {
  return `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000)}`;
}

export async function GET(request: NextRequest) {
  const session = await getSessionOrThrow();
  ensureDriverOrAdmin(session.user.role as any);

  const searchParams = request.nextUrl.searchParams;
  const sort = searchParams.get("sort") || "issueDate";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const where: Prisma.InvoiceWhereInput = {};

  if (status) {
    where.status = status as any;
  }

  if (search) {
    where.OR = [
      { number: { contains: search, mode: "insensitive" as const } },
      { customer: { name: { contains: search, mode: "insensitive" as const } } },
      { notes: { contains: search, mode: "insensitive" as const } },
      { lineItems: { some: { description: { contains: search, mode: "insensitive" as const } } } },
    ];
  }

  // Validate sort field to prevent injection
  const validSortFields = ["issueDate", "dueDate", "total", "status", "number", "createdAt"];
  const orderBy = validSortFields.includes(sort) ? { [sort]: order } : { issueDate: "desc" };

  const invoices = await prisma.invoice.findMany({
    where,
    include: { customer: true, lineItems: true, payments: true },
    orderBy: orderBy as any,
  });
  return NextResponse.json(invoices);
}

export async function POST(request: Request) {
  const session = await getSessionOrThrow();
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can create invoices" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = invoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const settings = await prisma.globalSetting.findFirst();
  const totals = calculateInvoiceTotals(parsed.data, settings?.isVatRegistered ?? true);

  const invoice = await prisma.invoice.create({
    data: {
      number: generateInvoiceNumber(),
      customerId: parsed.data.customerId,
      jobId: parsed.data.jobId || null,
      issueDate: new Date(parsed.data.issueDate),
      dueDate: new Date(parsed.data.dueDate),
      notes: parsed.data.notes,
      status: "DRAFT",
      subtotal: totals.subtotal,
      vatTotal: totals.vatTotal,
      total: totals.total,
      balanceDue: totals.total,
      createdById: session.user.id,
      lineItems: {
        create: parsed.data.lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatCode: item.vatCode,
          incomeAccount: item.incomeAccount,
          total: item.quantity * item.unitPrice,
        })),
      },
    },
    include: { lineItems: true },
  });

  // Auto-push to QBO if connected (fire-and-forget, don't block response)
  const qbCredential = await prisma.quickBooksCredential.findFirst();
  if (qbCredential) {
    pushInvoiceToQBO(invoice.id).catch((err) =>
      console.error("[QBO Push] Auto-push invoice failed:", err.message)
    );
  }

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  revalidatePath("/settings");

  return NextResponse.json(invoice, { status: 201 });
}
