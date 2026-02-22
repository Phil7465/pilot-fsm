import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentSchema } from "@/lib/validation";
import { getSessionOrThrow } from "@/lib/session";
import { ensureDriverOrAdmin } from "@/lib/permissions";
import { Decimal } from "@prisma/client/runtime/library";
import { getPaymentProvider } from "@/lib/payments/factory";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function GET(request: NextRequest) {
  const session = await getSessionOrThrow();
  ensureDriverOrAdmin(session.user.role as any);

  const searchParams = request.nextUrl.searchParams;
  const sort = searchParams.get("sort") || "paymentDate";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const search = searchParams.get("search");

  const where: Prisma.PaymentWhereInput = {};

  if (search) {
    where.OR = [
      { reference: { contains: search, mode: "insensitive" as const } },
      { invoice: { number: { contains: search, mode: "insensitive" as const } } },
      { invoice: { customer: { name: { contains: search, mode: "insensitive" as const } } } },
    ];
  }

  const validSortFields = ["paymentDate", "amount", "method", "createdAt"];
  const orderBy = validSortFields.includes(sort) ? { [sort]: order } : { paymentDate: "desc" };

  const payments = await prisma.payment.findMany({ where, include: { invoice: { include: { customer: true } } }, orderBy: orderBy as any });
  return NextResponse.json(payments);
}

export async function POST(request: Request) {
  try {
    const session = await getSessionOrThrow();
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can record payments" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) {
      console.error("[Payment Validation]", parsed.error.flatten());
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({ where: { id: parsed.data.invoiceId } });
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    let providerReference: string | undefined;
    if (["CARD", "DIRECT_DEBIT"].includes(parsed.data.method)) {
      try {
        const provider = await getPaymentProvider();
        const intent = await provider.createPaymentIntent({
          amount: parsed.data.amount,
          currency: invoice.currency,
          description: `Payment for ${invoice.number}`,
          metadata: { invoiceId: invoice.id },
        });
        providerReference = intent.id;
      } catch (err: any) {
        console.error("[Payment Provider Error]", err);
        return NextResponse.json({ error: `Payment processing failed: ${err.message}` }, { status: 400 });
      }
    }

    const payment = await prisma.payment.create({
      data: {
        invoiceId: parsed.data.invoiceId,
        amount: parsed.data.amount,
        paymentDate: new Date(parsed.data.paymentDate),
        method: parsed.data.method,
        reference: parsed.data.reference,
        providerPaymentId: providerReference,
        provider: providerReference ? (parsed.data.method === "CARD" ? "stripe" : "gocardless") : undefined,
      },
    });

    const newBalance = new Decimal(invoice.balanceDue).minus(parsed.data.amount);
    await prisma.invoice.update({
      where: { id: parsed.data.invoiceId },
      data: {
        balanceDue: newBalance,
        status: newBalance.lte(0) ? "PAID" : "PARTIAL",
      },
    });

    // Payments are synced FROM QBO — no push needed
    revalidatePath("/payments");
    revalidatePath("/invoices");
    revalidatePath("/dashboard");
    revalidatePath("/settings");

    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    console.error("[Payment POST Error]", error);
    const status = error.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status });
  }
}
