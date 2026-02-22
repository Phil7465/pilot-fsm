import { NextResponse } from "next/server";
import { getSessionOrThrow } from "@/lib/session";
import { ensureAdmin } from "@/lib/permissions";
import {
  pushCustomerToQBO,
  pushInvoiceToQBO,
  pushAllCustomersToQBO,
  pushAllInvoicesToQBO,
  pushAllToQBO,
} from "@/lib/quickbooks/push";

/**
 * POST /api/integrations/quickbooks/push
 *
 * Push local entities to QBO.
 *
 * Body:
 *   { entity: "customer", id: "..." }     — push single customer
 *   { entity: "invoice",  id: "..." }     — push single invoice
 *   { entity: "customers" }               — push all local-only customers
 *   { entity: "invoices" }                — push all local-only invoices
 *   { entity: "all" }                     — push all local-only records
 */
export async function POST(request: Request) {
  const session = await getSessionOrThrow();
  ensureAdmin(session.user.role as any);

  try {
    const body = await request.json();
    const { entity, id } = body as { entity: string; id?: string };

    let result;

    switch (entity) {
      case "customer":
        if (!id) return NextResponse.json({ error: "Customer ID required" }, { status: 400 });
        result = await pushCustomerToQBO(id);
        break;

      case "invoice":
        if (!id) return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });
        result = await pushInvoiceToQBO(id);
        break;

      case "customers":
        result = await pushAllCustomersToQBO();
        break;

      case "invoices":
        result = await pushAllInvoicesToQBO();
        break;

      case "all":
        result = await pushAllToQBO();
        break;

      default:
        return NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 400 });
    }

    return NextResponse.json({ status: "pushed", result });
  } catch (error: any) {
    console.error("QuickBooks push error:", error);
    return NextResponse.json(
      { error: error.message || "Push failed" },
      { status: 500 }
    );
  }
}
