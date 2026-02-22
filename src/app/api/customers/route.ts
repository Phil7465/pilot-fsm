import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validation";
import { getSessionOrThrow } from "@/lib/session";
import { ensureAdmin, ensureDriverOrAdmin } from "@/lib/permissions";
import { pushCustomerToQBO } from "@/lib/quickbooks/push";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function GET(request: NextRequest) {
  const session = await getSessionOrThrow();
  ensureDriverOrAdmin(session.user.role as any);

  const searchParams = request.nextUrl.searchParams;
  const sort = searchParams.get("sort") || "updatedAt";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const search = searchParams.get("search");

  const where: Prisma.CustomerWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" as const } },
      { company: { contains: search, mode: "insensitive" as const } },
      { email: { contains: search, mode: "insensitive" as const } },
      { phone: { contains: search, mode: "insensitive" as const } },
    ];
  }

  const validSortFields = ["name", "company", "email", "createdAt", "updatedAt"];
  const orderBy = validSortFields.includes(sort) ? { [sort]: order } : { updatedAt: "desc" };

  const customers = await prisma.customer.findMany({
    where,
    orderBy: orderBy as any,
  });
  return NextResponse.json(customers);
}

export async function POST(request: Request) {
  const session = await getSessionOrThrow();
  ensureAdmin(session.user.role as any);

  const body = await request.json();
  const parsed = customerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const customer = await prisma.customer.create({
    data: {
      ...parsed.data,
      createdById: session.user.id,
    },
  });

  // Auto-push to QBO if connected (fire-and-forget, don't block response)
  const qbCredential = await prisma.quickBooksCredential.findFirst();
  if (qbCredential) {
    pushCustomerToQBO(customer.id).catch((err) =>
      console.error("[QBO Push] Auto-push customer failed:", err.message)
    );
  }

  revalidatePath("/customers");
  revalidatePath("/dashboard");
  revalidatePath("/settings");

  return NextResponse.json(customer, { status: 201 });
}
