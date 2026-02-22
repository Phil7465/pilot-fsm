import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrThrow } from "@/lib/session";
import { ensureAdmin } from "@/lib/permissions";

export async function GET() {
  const session = await getSessionOrThrow();
  ensureAdmin(session.user.role as any);
  const settings = await prisma.paymentProviderSetting.findFirst();
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  const session = await getSessionOrThrow();
  ensureAdmin(session.user.role as any);
  const body = await request.json();

  const existing = await prisma.paymentProviderSetting.findFirst();
  const settings = existing
    ? await prisma.paymentProviderSetting.update({
        where: { id: existing.id },
        data: {
          activeProvider: body.activeProvider,
          stripeSecret: body.stripeSecret,
          stripeWebhookSecret: body.stripeWebhookSecret,
          gocardlessAccessToken: body.gocardlessAccessToken,
        },
      })
    : await prisma.paymentProviderSetting.create({
        data: {
          activeProvider: body.activeProvider,
          stripeSecret: body.stripeSecret,
          stripeWebhookSecret: body.stripeWebhookSecret,
          gocardlessAccessToken: body.gocardlessAccessToken,
        },
      });

  return NextResponse.json(settings);
}
