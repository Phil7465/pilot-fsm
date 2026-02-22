import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOAuthClient } from "@/lib/quickbooks/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const realmId = searchParams.get("realmId");

  if (!code || !realmId) {
    return NextResponse.json({ error: "Missing QuickBooks params" }, { status: 400 });
  }

  try {
    const client = getOAuthClient();
    const authResponse = await client.createToken(request.url);

    // intuit-oauth types vary by version; access the token object safely
    const token = (authResponse as any).getToken
      ? (authResponse as any).getToken()
      : (authResponse as any).token ?? authResponse;

    const existing = await prisma.quickBooksCredential.findFirst({ where: { realmId } });
    if (existing) {
      await prisma.quickBooksCredential.update({
        where: { id: existing.id },
        data: {
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          expiresAt: new Date(Date.now() + token.expires_in * 1000),
        },
      });
    } else {
      await prisma.quickBooksCredential.create({
        data: {
          realmId,
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          expiresAt: new Date(Date.now() + token.expires_in * 1000),
          companyId: realmId,
        },
      });
    }

    const redirectBase = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    return NextResponse.redirect(`${redirectBase}/integrations/quickbooks?connected=true`);
  } catch (error) {
    console.error("QuickBooks OAuth callback error:", error);
    return NextResponse.json({ 
      error: "Failed to connect QuickBooks", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
