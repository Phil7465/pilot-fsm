import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrThrow } from "@/lib/session";
import { ensureAdmin } from "@/lib/permissions";

export async function GET() {
  const session = await getSessionOrThrow();
  ensureAdmin(session.user.role as any);
  const settings = await prisma.globalSetting.findFirst();
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  const session = await getSessionOrThrow();
  ensureAdmin(session.user.role as any);
  const body = await request.json();
  const existing = await prisma.globalSetting.findFirst();
  const settings = existing
    ? await prisma.globalSetting.update({
        where: { id: existing.id },
        data: {
          companyName: body.companyName,
          companyNameSize: body.companyNameSize,
          companyNameWeight: body.companyNameWeight,
          isVatRegistered: body.isVatRegistered,
          defaultCurrency: body.defaultCurrency,
          defaultNetTerms: body.defaultNetTerms,
        },
      })
    : await prisma.globalSetting.create({
        data: {
          companyName: body.companyName,
          companyNameSize: body.companyNameSize,
          companyNameWeight: body.companyNameWeight,
          isVatRegistered: body.isVatRegistered,
          defaultCurrency: body.defaultCurrency,
          defaultNetTerms: body.defaultNetTerms,
        },
      });
  return NextResponse.json(settings);
}
