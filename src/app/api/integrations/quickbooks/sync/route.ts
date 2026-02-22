import { NextResponse } from "next/server";
import { getSessionOrThrow } from "@/lib/session";
import { ensureAdmin } from "@/lib/permissions";
import {
  syncCustomersFromQBO,
  syncItemsFromQBO,
  syncInvoicesFromQBO,
  syncPaymentsFromQBO,
  runFullSync,
  resetSyncTimestamps,
} from "@/lib/quickbooks/sync";

export async function POST(request: Request) {
  const session = await getSessionOrThrow();
  ensureAdmin(session.user.role as any);
  
  try {
    const body = await request.json();
    const { entity } = body as { entity?: "customer" | "item" | "invoice" | "payment" | "all" | "reset" };

    let result;

    switch (entity) {
      case "customer":
        result = await syncCustomersFromQBO();
        break;
      case "item":
        result = await syncItemsFromQBO();
        break;
      case "invoice":
        result = await syncInvoicesFromQBO();
        break;
      case "payment":
        result = await syncPaymentsFromQBO();
        break;
      case "reset":
        await resetSyncTimestamps();
        result = { message: "Sync timestamps reset. Next sync will pull all records." };
        break;
      case "all":
      default:
        result = await runFullSync();
        break;
    }

    return NextResponse.json({ 
      status: "synced",
      result,
      environment: process.env.QBO_ENVIRONMENT || 'sandbox'
    });
  } catch (error: any) {
    console.error("QuickBooks sync error:", error);
    return NextResponse.json(
      { 
        error: error.message || "Sync failed",
        environment: process.env.QBO_ENVIRONMENT || 'sandbox'
      },
      { status: 500 }
    );
  }
}
