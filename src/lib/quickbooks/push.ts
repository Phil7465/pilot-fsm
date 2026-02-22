/**
 * QuickBooks Push Sync — App → QBO
 *
 * Pushes locally-created Customers and Invoices to QuickBooks Online.
 *
 * Design principles:
 *  1. Only push entities that don't already have a QB ID
 *  2. For invoices, let QBO calculate tax — send TaxCodeRef per line, not tax amounts
 *  3. Log everything to SyncLog
 *  4. Rate-limited and retried via makeQBRequest
 *  5. After push, store the returned QB ID + SyncToken locally
 */

import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { authenticatedClient, makeQBRequest, type SyncResult } from "./sync";

// ─── Sync Logger (reused pattern from pull sync) ─────────────────────────────

async function logSync(
  entity: string,
  direction: "app_to_qbo",
  action: "create" | "update" | "skip" | "error",
  opts?: { entityId?: string; qbId?: string; message?: string; details?: any }
) {
  try {
    await prisma.syncLog.create({
      data: {
        entity,
        direction,
        action,
        entityId: opts?.entityId,
        qbId: opts?.qbId,
        message: opts?.message,
        details: opts?.details ?? undefined,
      },
    });
  } catch {
    console.error("[SyncLog] Failed to write log entry");
  }
}

// ─── VAT Code → QBO TaxCodeRef mapping (UK) ─────────────────────────────────

/**
 * Maps app VAT codes to QBO TaxCodeRef values.
 * For UK QBO: "TAX" = standard-rated, "NON" = zero/exempt
 * This is the safe approach — QBO resolves actual rates from the tax code.
 */
function vatCodeToQBTaxCode(vatCode: string): string {
  switch (vatCode) {
    case "STANDARD":
    case "REDUCED":
      return "TAX";
    case "ZERO":
    case "EXEMPT":
    default:
      return "NON";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PUSH CUSTOMER: App → QBO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Push a single customer to QuickBooks.
 * Creates a new Customer in QBO if no qbCustomerId exists.
 * Updates an existing Customer if qbCustomerId is already set.
 */
export async function pushCustomerToQBO(customerId: string): Promise<{
  success: boolean;
  qbCustomerId?: string;
  error?: string;
}> {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { success: false, error: "Customer not found" };

  const { accessToken, realmId } = await authenticatedClient();

  try {
    if (customer.qbCustomerId) {
      // UPDATE existing QBO customer (sparse update)
      const updatePayload: any = {
        Id: customer.qbCustomerId,
        SyncToken: customer.qbSyncToken || "0",
        sparse: true,
        DisplayName: customer.company || customer.name,
        GivenName: customer.name.split(" ")[0] || customer.name,
        FamilyName: customer.name.split(" ").slice(1).join(" ") || undefined,
        CompanyName: customer.company || undefined,
        PrimaryEmailAddr: customer.email ? { Address: customer.email } : undefined,
        PrimaryPhone: customer.phone ? { FreeFormNumber: customer.phone } : undefined,
        BillAddr: {
          Line1: customer.addressLine,
          City: customer.city,
          PostalCode: customer.postcode,
          Country: customer.country,
        },
      };

      // Add shipping address if present
      if (customer.shipAddressLine) {
        updatePayload.ShipAddr = {
          Line1: customer.shipAddressLine,
          City: customer.shipCity || "",
          PostalCode: customer.shipPostcode || "",
          Country: customer.shipCountry || customer.country,
        };
      }

      const response = await makeQBRequest(accessToken, realmId, "POST", "customer", updatePayload);
      const qbCust = response.Customer;

      await prisma.customer.update({
        where: { id: customerId },
        data: { qbSyncToken: qbCust.SyncToken },
      });

      await logSync("customer", "app_to_qbo", "update", {
        entityId: customerId,
        qbId: customer.qbCustomerId,
        message: `Updated customer "${customer.name}" in QBO`,
      });

      return { success: true, qbCustomerId: customer.qbCustomerId };
    } else {
      // CREATE new QBO customer
      // First check for duplicate DisplayName in QBO
      const displayName = customer.company || customer.name;
      const checkQuery = `SELECT Id, DisplayName FROM Customer WHERE DisplayName = '${displayName.replace(/'/g, "\\'")}'`;
      const checkResult = await makeQBRequest(
        accessToken, realmId, "GET",
        `query?query=${encodeURIComponent(checkQuery)}`
      );

      const existingQB = checkResult.QueryResponse?.Customer;
      if (existingQB && existingQB.length > 0) {
        // Customer already exists in QBO — link rather than duplicate
        const qbCust = existingQB[0];
        await prisma.customer.update({
          where: { id: customerId },
          data: { qbCustomerId: qbCust.Id, qbSyncToken: qbCust.SyncToken },
        });

        await logSync("customer", "app_to_qbo", "skip", {
          entityId: customerId,
          qbId: qbCust.Id,
          message: `Linked to existing QBO customer "${displayName}" (ID: ${qbCust.Id})`,
        });

        return { success: true, qbCustomerId: qbCust.Id };
      }

      const createPayload: any = {
        DisplayName: displayName,
        GivenName: customer.name.split(" ")[0] || customer.name,
        FamilyName: customer.name.split(" ").slice(1).join(" ") || undefined,
        CompanyName: customer.company || undefined,
        PrimaryEmailAddr: customer.email ? { Address: customer.email } : undefined,
        PrimaryPhone: customer.phone ? { FreeFormNumber: customer.phone } : undefined,
        BillAddr: {
          Line1: customer.addressLine,
          City: customer.city,
          PostalCode: customer.postcode,
          Country: customer.country,
        },
      };

      if (customer.shipAddressLine) {
        createPayload.ShipAddr = {
          Line1: customer.shipAddressLine,
          City: customer.shipCity || "",
          PostalCode: customer.shipPostcode || "",
          Country: customer.shipCountry || customer.country,
        };
      }

      const response = await makeQBRequest(accessToken, realmId, "POST", "customer", createPayload);
      const qbCust = response.Customer;

      await prisma.customer.update({
        where: { id: customerId },
        data: {
          qbCustomerId: qbCust.Id,
          qbSyncToken: qbCust.SyncToken,
        },
      });

      await logSync("customer", "app_to_qbo", "create", {
        entityId: customerId,
        qbId: qbCust.Id,
        message: `Created customer "${customer.name}" in QBO`,
      });

      return { success: true, qbCustomerId: qbCust.Id };
    }
  } catch (err: any) {
    const msg = `Push customer "${customer.name}" failed: ${err.message}`;
    await logSync("customer", "app_to_qbo", "error", {
      entityId: customerId,
      message: msg,
    });
    return { success: false, error: msg };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PUSH INVOICE: App → QBO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Push a single invoice to QuickBooks.
 * The customer must already be synced (have a qbCustomerId).
 * Line items reference QBO Items via qbItemId on ServiceTemplate.
 * QBO calculates VAT — we only send TaxCodeRef per line.
 */
export async function pushInvoiceToQBO(invoiceId: string): Promise<{
  success: boolean;
  qbInvoiceId?: string;
  error?: string;
}> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: true,
      lineItems: {
        include: { serviceTemplate: true },
      },
    },
  });

  if (!invoice) return { success: false, error: "Invoice not found" };
  if (invoice.qbInvoiceId) {
    return { success: false, error: "Invoice already synced to QBO" };
  }

  // Customer must be in QBO first
  if (!invoice.customer.qbCustomerId) {
    // Try to push the customer first
    const custResult = await pushCustomerToQBO(invoice.customer.id);
    if (!custResult.success) {
      return { success: false, error: `Cannot push invoice — customer push failed: ${custResult.error}` };
    }
    // Reload customer to get fresh qbCustomerId
    const freshCustomer = await prisma.customer.findUnique({ where: { id: invoice.customer.id } });
    if (!freshCustomer?.qbCustomerId) {
      return { success: false, error: "Customer still not linked to QBO after push" };
    }
    invoice.customer.qbCustomerId = freshCustomer.qbCustomerId;
  }

  const { accessToken, realmId } = await authenticatedClient();

  try {
    // Build QBO Line items
    const qbLines: any[] = invoice.lineItems.map((li, idx) => {
      const line: any = {
        DetailType: "SalesItemLineDetail",
        Amount: Number(li.total),  // Net amount (qty × unitPrice), QBO adds tax on top
        Description: li.description,
        SalesItemLineDetail: {
          Qty: Number(li.quantity),
          UnitPrice: Number(li.unitPrice),
          TaxCodeRef: { value: vatCodeToQBTaxCode(li.vatCode) },
        },
      };

      // Link to QBO Item if the service template has a qbItemId
      if (li.serviceTemplate?.qbItemId) {
        line.SalesItemLineDetail.ItemRef = {
          value: li.serviceTemplate.qbItemId,
          name: li.serviceTemplate.name,
        };
      }

      return line;
    });

    const createPayload: any = {
      CustomerRef: { value: invoice.customer.qbCustomerId },
      DocNumber: invoice.number,
      TxnDate: invoice.issueDate.toISOString().split("T")[0],
      DueDate: invoice.dueDate.toISOString().split("T")[0],
      Line: qbLines,
      CurrencyRef: { value: invoice.currency || "GBP" },
    };

    if (invoice.notes) {
      createPayload.CustomerMemo = { value: invoice.notes };
    }

    if (invoice.qbPrivateNote) {
      createPayload.PrivateNote = invoice.qbPrivateNote;
    }

    const response = await makeQBRequest(accessToken, realmId, "POST", "invoice", createPayload);
    const qbInv = response.Invoice;

    // Store QBO IDs and update totals from QBO's calculation
    const qbTotal = Number(qbInv.TotalAmt ?? 0);
    const qbTaxTotal = qbInv.TxnTaxDetail?.TotalTax != null ? Number(qbInv.TxnTaxDetail.TotalTax) : 0;
    const qbSubtotal = qbTotal - qbTaxTotal;

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        qbInvoiceId: qbInv.Id,
        qbSyncToken: qbInv.SyncToken,
        // Update totals from QBO's calculation (QBO is financial source of truth)
        subtotal: new Decimal(qbSubtotal.toFixed(2)),
        vatTotal: new Decimal(qbTaxTotal.toFixed(2)),
        total: new Decimal(qbTotal.toFixed(2)),
        balanceDue: new Decimal(Number(qbInv.Balance ?? qbTotal).toFixed(2)),
      },
    });

    // Update line item QBO line IDs
    const qbSalesLines = (qbInv.Line || []).filter((l: any) => l.DetailType === "SalesItemLineDetail");
    for (let i = 0; i < Math.min(invoice.lineItems.length, qbSalesLines.length); i++) {
      if (qbSalesLines[i].Id) {
        await prisma.invoiceLineItem.update({
          where: { id: invoice.lineItems[i].id },
          data: { qbLineId: qbSalesLines[i].Id },
        });
      }
    }

    await logSync("invoice", "app_to_qbo", "create", {
      entityId: invoiceId,
      qbId: qbInv.Id,
      message: `Pushed invoice ${invoice.number} to QBO (Total: ${qbTotal})`,
    });

    return { success: true, qbInvoiceId: qbInv.Id };
  } catch (err: any) {
    const msg = `Push invoice ${invoice.number} failed: ${err.message}`;
    await logSync("invoice", "app_to_qbo", "error", {
      entityId: invoiceId,
      message: msg,
    });
    return { success: false, error: msg };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BULK PUSH: Push all local-only records to QBO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Push all local-only customers to QBO.
 */
export async function pushAllCustomersToQBO(): Promise<SyncResult> {
  const localOnly = await prisma.customer.findMany({
    where: { qbCustomerId: null },
  });

  let created = 0, updated = 0, skipped = 0, errors = 0;
  const errorDetails: string[] = [];

  for (const customer of localOnly) {
    const result = await pushCustomerToQBO(customer.id);
    if (result.success) {
      created++;
    } else {
      errorDetails.push(result.error || "Unknown error");
      errors++;
    }
  }

  return {
    entity: "customer",
    direction: "app_to_qbo",
    created,
    updated,
    skipped,
    errors,
    total: localOnly.length,
    errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
  };
}

/**
 * Push all local-only invoices to QBO.
 */
export async function pushAllInvoicesToQBO(): Promise<SyncResult> {
  const localOnly = await prisma.invoice.findMany({
    where: { qbInvoiceId: null },
    include: { customer: true },
  });

  let created = 0, updated = 0, skipped = 0, errors = 0;
  const errorDetails: string[] = [];

  for (const invoice of localOnly) {
    const result = await pushInvoiceToQBO(invoice.id);
    if (result.success) {
      created++;
    } else {
      errorDetails.push(result.error || "Unknown error");
      errors++;
    }
  }

  return {
    entity: "invoice",
    direction: "app_to_qbo",
    created,
    updated,
    skipped,
    errors,
    total: localOnly.length,
    errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
  };
}

/**
 * Push all local-only records (customers first, then invoices) to QBO.
 */
export async function pushAllToQBO(): Promise<{
  status: "completed" | "partial" | "failed";
  results: Record<string, SyncResult>;
}> {
  const results: Record<string, SyncResult> = {};
  let hasErrors = false;

  try {
    results.customers = await pushAllCustomersToQBO();
    if (results.customers.errors > 0) hasErrors = true;
  } catch (err: any) {
    results.customers = {
      entity: "customer", direction: "app_to_qbo",
      created: 0, updated: 0, skipped: 0, errors: 1, total: 0,
      errorDetails: [err.message],
    };
    hasErrors = true;
  }

  try {
    results.invoices = await pushAllInvoicesToQBO();
    if (results.invoices.errors > 0) hasErrors = true;
  } catch (err: any) {
    results.invoices = {
      entity: "invoice", direction: "app_to_qbo",
      created: 0, updated: 0, skipped: 0, errors: 1, total: 0,
      errorDetails: [err.message],
    };
    hasErrors = true;
  }

  return { status: hasErrors ? "partial" : "completed", results };
}
