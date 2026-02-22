import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getQuickBooksClient } from "@/lib/integrations/quickbooks";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const qbClient = await getQuickBooksClient();
    const authUrl = qbClient.authorizeUri({
      scope: [
        "com.intuit.quickbooks.accounting",
        "com.intuit.quickbooks.payment",
      ],
      state: "random-state-string",
    });

    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error("Failed to generate QuickBooks auth URL:", error);
    return NextResponse.json(
      { error: "Failed to generate authorization URL" },
      { status: 500 }
    );
  }
}
