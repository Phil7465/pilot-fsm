import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrThrow } from "@/lib/session";
import { ensureDriverOrAdmin } from "@/lib/permissions";

interface Params {
  params: { id: string };
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSessionOrThrow();
  ensureDriverOrAdmin(session.user.role as any);

  const body = await request.json();
  const invoice = await prisma.invoice.update({
    where: { id: params.id },
    data: {
      status: body.status,
      notes: body.notes,
    },
    include: { lineItems: true, payments: true },
  });

  return NextResponse.json(invoice);
}
