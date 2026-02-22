import { NextResponse } from "next/server";
import { getSessionOrThrow } from "@/lib/session";
import { ensureAdmin } from "@/lib/permissions";
import { getOAuthClient } from "@/lib/quickbooks/client";

export async function GET() {
  const session = await getSessionOrThrow();
  ensureAdmin(session.user.role as any);

  if (!process.env.QBO_CLIENT_ID || !process.env.QBO_CLIENT_SECRET) {
    return NextResponse.json({ error: "QuickBooks env vars not configured" }, { status: 500 });
  }

  const client = getOAuthClient();
  const authorizeUrl = client.authorizeUri({
    scope: ["com.intuit.quickbooks.accounting"],
    state: Math.random().toString(36).substring(2, 10),
  });

  return NextResponse.json({ url: authorizeUrl });
}
