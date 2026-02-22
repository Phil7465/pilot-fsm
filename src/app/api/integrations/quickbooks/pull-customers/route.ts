import { NextResponse } from "next/server";
import { getSessionOrThrow } from "@/lib/session";
import { ensureAdmin } from "@/lib/permissions";
import { syncCustomersFromQBO } from "@/lib/quickbooks/sync";

export async function POST() {
  const session = await getSessionOrThrow();
  ensureAdmin(session.user.role as any);

  try {
    const result = await syncCustomersFromQBO();

    return NextResponse.json({
      status: "success",
      ...result,
      environment: process.env.QBO_ENVIRONMENT || "sandbox",
    });
  } catch (error: any) {
    console.error("Pull customers error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to pull customers from QuickBooks",
        environment: process.env.QBO_ENVIRONMENT || "sandbox",
      },
      { status: 500 }
    );
  }
}
