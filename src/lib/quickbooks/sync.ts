/**
 * QuickBooks Pull Sync Layer — QBO → App
 * 
 * Design principles:
 *  1. QBO is the financial source of truth
 *  2. The app is the operational layer (jobs, drivers, dispatch, delivery notes)
 *  3. Financial data flows QBO → App via delta sync (this file)
 *  4. App pushes Customers & Invoices → QBO via push.ts
 *  5. App NEVER recalculates VAT, modifies invoice totals, or changes line Amounts
 *  6. Rate-limited, retried, and logged
 *
 * See also: push.ts for App → QBO sync
 */

import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { getActiveQuickBooksCredential, getOAuthClient, refreshAccessToken } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SyncResult {
  entity: string;
  direction: "qbo_to_app" | "app_to_qbo";
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  total: number;
  errorDetails?: string[];
}

interface RateLimiterState {
  tokens: number;
  lastRefill: number;
}

// ─── Rate Limiter (token bucket, 500 req/min for QBO) ─────────────────────────

const rateLimiter: RateLimiterState = {
  tokens: 500,
  lastRefill: Date.now(),
};

function acquireRateToken(): boolean {
  const now = Date.now();
  const elapsed = now - rateLimiter.lastRefill;
  const refill = Math.floor(elapsed / 120); // ~8.3 tokens/sec
  if (refill > 0) {
    rateLimiter.tokens = Math.min(500, rateLimiter.tokens + refill);
    rateLimiter.lastRefill = now;
  }
  if (rateLimiter.tokens > 0) {
    rateLimiter.tokens--;
    return true;
  }
  return false;
}

async function waitForRateToken(maxWaitMs = 10000): Promise<void> {
  const start = Date.now();
  while (!acquireRateToken()) {
    if (Date.now() - start > maxWaitMs) {
      throw new Error("Rate limit: waited too long for QBO API token");
    }
    await sleep(200);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Sync Logger ──────────────────────────────────────────────────────────────

async function logSync(
  entity: string,
  direction: "qbo_to_app" | "app_to_qbo",
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

// ─── Authenticated Client (preserved from original) ──────────────────────────

export async function authenticatedClient() {
  const credential = await getActiveQuickBooksCredential();
  if (!credential) throw new Error("QuickBooks not connected");

  if (new Date(credential.expiresAt) < new Date()) {
    await refreshAccessToken();
  }

  const updated = await getActiveQuickBooksCredential();
  if (!updated) throw new Error("QuickBooks not connected");

  return {
    client: getOAuthClient({
      accessToken: updated.accessToken,
      refreshToken: updated.refreshToken,
      realmId: updated.realmId,
    }),
    realmId: updated.realmId,
    accessToken: updated.accessToken,
  };
}

// ─── QBO API Request with retry + rate limiting ──────────────────────────────

export async function makeQBRequest(
  accessToken: string,
  realmId: string,
  method: string,
  endpoint: string,
  data?: any,
  retries = 3
): Promise<any> {
  const baseUrl =
    process.env.QBO_ENVIRONMENT === "production"
      ? "https://quickbooks.api.intuit.com"
      : "https://sandbox-quickbooks.api.intuit.com";

  const url = `${baseUrl}/v3/company/${realmId}/${endpoint}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    await waitForRateToken();

    try {
      const headers: HeadersInit = {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      };

      const options: RequestInit = { method, headers };
      if (data) options.body = JSON.stringify(data);

      const response = await fetch(url, options);

      // Handle rate limiting (429)
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "30", 10);
        console.warn(`[QBO] Rate limited, waiting ${retryAfter}s (attempt ${attempt}/${retries})`);
        await sleep(retryAfter * 1000);
        continue;
      }

      // Handle server errors with retry
      if (response.status >= 500 && attempt < retries) {
        console.warn(`[QBO] Server error ${response.status}, retrying (attempt ${attempt}/${retries})`);
        await sleep(1000 * attempt);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`QBO API ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error: any) {
      if (attempt === retries) throw error;
      console.warn(`[QBO] Request failed, retrying (attempt ${attempt}/${retries}): ${error.message}`);
      await sleep(1000 * attempt);
    }
  }
}

// ─── Delta Query Helper ──────────────────────────────────────────────────────

function buildDeltaQuery(
  entity: string,
  lastSync: Date | null,
  extraWhere?: string,
  maxResults = 1000
): string {
  let query = `SELECT * FROM ${entity}`;
  const conditions: string[] = [];

  if (lastSync) {
    const safeTime = new Date(lastSync.getTime() - 60000); // 1min clock skew
    conditions.push(`MetaData.LastUpdatedTime > '${safeTime.toISOString()}'`);
  }

  if (extraWhere) conditions.push(extraWhere);

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += ` MAXRESULTS ${maxResults}`;
  return query;
}

// ─── Settings Helper ─────────────────────────────────────────────────────────

async function getSyncSettings() {
  let settings = await prisma.quickBooksSyncSetting.findFirst();
  if (!settings) {
    settings = await prisma.quickBooksSyncSetting.create({
      data: {
        syncCustomers: true,
        syncInvoices: true,
        syncPayments: true,
        syncItems: true,
        autoSync: false,
      },
    });
  }
  return settings;
}

// ─── Admin User Helper ───────────────────────────────────────────────────────

async function getAdminUserId(): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (!admin) throw new Error("No admin user found for sync");
  return admin.id;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CUSTOMER SYNC: QBO → App
// ═══════════════════════════════════════════════════════════════════════════════

export async function syncCustomersFromQBO(): Promise<SyncResult> {
  const settings = await getSyncSettings();
  if (!settings.syncCustomers) {
    return { entity: "customer", direction: "qbo_to_app", created: 0, updated: 0, skipped: 0, errors: 0, total: 0 };
  }

  const { accessToken, realmId } = await authenticatedClient();
  const adminId = await getAdminUserId();

  const query = buildDeltaQuery("Customer", settings.lastCustomerSync);
  const result = await makeQBRequest(accessToken, realmId, "GET", `query?query=${encodeURIComponent(query)}`);
  const qbCustomers = result.QueryResponse?.Customer || [];

  let created = 0, updated = 0, skipped = 0, errors = 0;
  const errorDetails: string[] = [];
  let latestUpdate: Date | null = null;

  for (const qb of qbCustomers) {
    try {
      const qbId = qb.Id;
      const billAddr = qb.BillAddr || {};
      const shipAddr = qb.ShipAddr || {};
      const name =
        qb.GivenName && qb.FamilyName
          ? `${qb.GivenName} ${qb.FamilyName}`
          : qb.DisplayName || "Unknown";

      const customerData = {
        name,
        company: qb.CompanyName || null,
        phone: qb.PrimaryPhone?.FreeFormNumber || null,
        email: qb.PrimaryEmailAddr?.Address || null,
        addressLine: billAddr.Line1 || "",
        city: billAddr.City || "",
        postcode: billAddr.PostalCode || "",
        country: billAddr.Country || "GB",
        shipAddressLine: shipAddr.Line1 || null,
        shipCity: shipAddr.City || null,
        shipPostcode: shipAddr.PostalCode || null,
        shipCountry: shipAddr.Country || null,
        qbCustomerId: qbId,
        qbSyncToken: qb.SyncToken,
        qbActive: qb.Active !== false,
      };

      if (qb.MetaData?.LastUpdatedTime) {
        const ts = new Date(qb.MetaData.LastUpdatedTime);
        if (!latestUpdate || ts > latestUpdate) latestUpdate = ts;
      }

      const existing = await prisma.customer.findFirst({ where: { qbCustomerId: qbId } });

      if (existing) {
        await prisma.customer.update({ where: { id: existing.id }, data: customerData });
        await logSync("customer", "qbo_to_app", "update", { entityId: existing.id, qbId });
        updated++;
      } else {
        const newCust = await prisma.customer.create({
          data: { ...customerData, createdById: adminId },
        });
        await logSync("customer", "qbo_to_app", "create", { entityId: newCust.id, qbId });
        created++;
      }
    } catch (err: any) {
      const msg = `Customer ${qb.DisplayName}: ${err.message}`;
      errorDetails.push(msg);
      await logSync("customer", "qbo_to_app", "error", { qbId: qb.Id, message: msg });
      errors++;
    }
  }

  if (latestUpdate) {
    await prisma.quickBooksSyncSetting.update({
      where: { id: settings.id },
      data: { lastCustomerSync: latestUpdate },
    });
  }

  return { entity: "customer", direction: "qbo_to_app", created, updated, skipped, errors, total: qbCustomers.length, errorDetails: errorDetails.length > 0 ? errorDetails : undefined };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ITEM SYNC: QBO → App (Items → ServiceTemplate)
// ═══════════════════════════════════════════════════════════════════════════════

export async function syncItemsFromQBO(): Promise<SyncResult> {
  const settings = await getSyncSettings();
  if (!settings.syncItems) {
    return { entity: "item", direction: "qbo_to_app", created: 0, updated: 0, skipped: 0, errors: 0, total: 0 };
  }

  const { accessToken, realmId } = await authenticatedClient();

  const query = buildDeltaQuery("Item", settings.lastItemSync, "Type IN ('Service', 'NonInventory')");
  const result = await makeQBRequest(accessToken, realmId, "GET", `query?query=${encodeURIComponent(query)}`);
  const qbItems = result.QueryResponse?.Item || [];

  let created = 0, updated = 0, skipped = 0, errors = 0;
  const errorDetails: string[] = [];
  let latestUpdate: Date | null = null;

  for (const qb of qbItems) {
    try {
      const qbId = qb.Id;
      const unitPrice = qb.UnitPrice ?? 0;
      const incomeAccountRef = qb.IncomeAccountRef?.name || qb.IncomeAccountRef?.value || "Sales";

      const templateData = {
        name: qb.Name,
        description: qb.Description || null,
        unitPrice: new Decimal(unitPrice),
        incomeAccount: incomeAccountRef,
        qbItemId: qbId,
        qbSyncToken: qb.SyncToken,
        qbItemType: qb.Type || null,
        qbActive: qb.Active !== false,
      };

      if (qb.MetaData?.LastUpdatedTime) {
        const ts = new Date(qb.MetaData.LastUpdatedTime);
        if (!latestUpdate || ts > latestUpdate) latestUpdate = ts;
      }

      const existing = await prisma.serviceTemplate.findFirst({ where: { qbItemId: qbId } });

      if (existing) {
        await prisma.serviceTemplate.update({ where: { id: existing.id }, data: templateData });
        await logSync("item", "qbo_to_app", "update", { entityId: existing.id, qbId });
        updated++;
      } else {
        const newItem = await prisma.serviceTemplate.create({ data: templateData });
        await logSync("item", "qbo_to_app", "create", { entityId: newItem.id, qbId });
        created++;
      }
    } catch (err: any) {
      const msg = `Item ${qb.Name}: ${err.message}`;
      errorDetails.push(msg);
      await logSync("item", "qbo_to_app", "error", { qbId: qb.Id, message: msg });
      errors++;
    }
  }

  if (latestUpdate) {
    await prisma.quickBooksSyncSetting.update({
      where: { id: settings.id },
      data: { lastItemSync: latestUpdate },
    });
  }

  return { entity: "item", direction: "qbo_to_app", created, updated, skipped, errors, total: qbItems.length, errorDetails: errorDetails.length > 0 ? errorDetails : undefined };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INVOICE SYNC: QBO → App (with line items)
// ═══════════════════════════════════════════════════════════════════════════════

export async function syncInvoicesFromQBO(): Promise<SyncResult> {
  const settings = await getSyncSettings();
  if (!settings.syncInvoices) {
    return { entity: "invoice", direction: "qbo_to_app", created: 0, updated: 0, skipped: 0, errors: 0, total: 0 };
  }

  const { accessToken, realmId } = await authenticatedClient();
  const adminId = await getAdminUserId();

  const query = buildDeltaQuery("Invoice", settings.lastInvoiceSync);
  const result = await makeQBRequest(accessToken, realmId, "GET", `query?query=${encodeURIComponent(query)}`);
  const qbInvoices = result.QueryResponse?.Invoice || [];

  let created = 0, updated = 0, skipped = 0, errors = 0;
  const errorDetails: string[] = [];
  let latestUpdate: Date | null = null;

  for (const qb of qbInvoices) {
    try {
      const qbId = qb.Id;

      if (qb.MetaData?.LastUpdatedTime) {
        const ts = new Date(qb.MetaData.LastUpdatedTime);
        if (!latestUpdate || ts > latestUpdate) latestUpdate = ts;
      }

      // Customer must exist locally
      const customerQbId = qb.CustomerRef?.value;
      if (!customerQbId) {
        await logSync("invoice", "qbo_to_app", "skip", { qbId, message: "No CustomerRef" });
        skipped++;
        continue;
      }

      const customer = await prisma.customer.findFirst({ where: { qbCustomerId: customerQbId } });
      if (!customer) {
        await logSync("invoice", "qbo_to_app", "skip", {
          qbId, message: `Customer QB ID ${customerQbId} not found locally`,
        });
        skipped++;
        continue;
      }

      // Map QBO status
      const qbBalance = Number(qb.Balance ?? 0);
      const qbTotal = Number(qb.TotalAmt ?? 0);
      let status: "DRAFT" | "SENT" | "PARTIAL" | "PAID" | "OVERDUE" = "SENT";
      if (qbBalance === 0 && qbTotal > 0) status = "PAID";
      else if (qbBalance > 0 && qbBalance < qbTotal) status = "PARTIAL";
      else if (qb.DueDate && new Date(qb.DueDate) < new Date() && qbBalance > 0) status = "OVERDUE";

      // QBO amounts are source of truth — NEVER recalculate
      const taxTotal = qb.TxnTaxDetail?.TotalTax != null
        ? new Decimal(Number(qb.TxnTaxDetail.TotalTax))
        : new Decimal(0);
      const netSubtotal = qbTotal > 0 ? new Decimal(qbTotal).minus(taxTotal) : new Decimal(0);

      const salesLines = (qb.Line || []).filter((l: any) => l.DetailType === "SalesItemLineDetail");

      const invoiceData = {
        customerId: customer.id,
        number: qb.DocNumber || `QB-${qbId}`,
        issueDate: new Date(qb.TxnDate || new Date()),
        dueDate: new Date(qb.DueDate || qb.TxnDate || new Date()),
        status,
        subtotal: netSubtotal,
        vatTotal: taxTotal,
        total: new Decimal(qbTotal),
        balanceDue: new Decimal(qbBalance),
        currency: qb.CurrencyRef?.value || "GBP",
        notes: qb.CustomerMemo?.value || null,
        qbInvoiceId: qbId,
        qbSyncToken: qb.SyncToken,
        qbPrivateNote: qb.PrivateNote || null,
      };

      const existing = await prisma.invoice.findFirst({
        where: { qbInvoiceId: qbId },
        include: { lineItems: true },
      });

      if (existing) {
        await prisma.invoice.update({
          where: { id: existing.id },
          data: { ...invoiceData, number: existing.number },
        });
        await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: existing.id } });
        await createLineItemsFromQBO(existing.id, salesLines);
        await logSync("invoice", "qbo_to_app", "update", { entityId: existing.id, qbId });
        updated++;
      } else {
        // Avoid duplicate number
        const existingNumber = await prisma.invoice.findFirst({ where: { number: invoiceData.number } });
        if (existingNumber) invoiceData.number = `QB-${qbId}-${Date.now()}`;

        const newInv = await prisma.invoice.create({
          data: { ...invoiceData, createdById: adminId },
        });
        await createLineItemsFromQBO(newInv.id, salesLines);
        await logSync("invoice", "qbo_to_app", "create", { entityId: newInv.id, qbId });
        created++;
      }
    } catch (err: any) {
      const msg = `Invoice QB-${qb.Id}: ${err.message}`;
      errorDetails.push(msg);
      await logSync("invoice", "qbo_to_app", "error", { qbId: qb.Id, message: msg });
      errors++;
    }
  }

  if (latestUpdate) {
    await prisma.quickBooksSyncSetting.update({
      where: { id: settings.id },
      data: { lastInvoiceSync: latestUpdate },
    });
  }

  return { entity: "invoice", direction: "qbo_to_app", created, updated, skipped, errors, total: qbInvoices.length, errorDetails: errorDetails.length > 0 ? errorDetails : undefined };
}

/** Create InvoiceLineItems from QBO line data. Amounts from QBO unchanged. */
async function createLineItemsFromQBO(invoiceId: string, salesLines: any[]) {
  for (const line of salesLines) {
    const detail = line.SalesItemLineDetail || {};
    const qty = Number(detail.Qty ?? 1);
    const unitPrice = Number(detail.UnitPrice ?? 0);
    const amount = Number(line.Amount ?? 0);

    let serviceTemplateId: string | null = null;
    if (detail.ItemRef?.value) {
      const tmpl = await prisma.serviceTemplate.findFirst({ where: { qbItemId: detail.ItemRef.value } });
      if (tmpl) serviceTemplateId = tmpl.id;
    }

    const taxCodeRef = detail.TaxCodeRef?.value || "NON";
    let vatCode: "STANDARD" | "REDUCED" | "ZERO" | "EXEMPT" = "EXEMPT";
    if (taxCodeRef === "TAX" || taxCodeRef === "20.0") vatCode = "STANDARD";
    else if (taxCodeRef === "5.0") vatCode = "REDUCED";
    else if (taxCodeRef === "NON" || taxCodeRef === "0.0") vatCode = "ZERO";

    await prisma.invoiceLineItem.create({
      data: {
        invoiceId,
        serviceTemplateId,
        description: line.Description || "",
        quantity: new Decimal(qty),
        unitPrice: new Decimal(unitPrice),
        vatCode,
        incomeAccount: detail.ItemRef?.name || "Sales",
        total: new Decimal(amount),
        qbLineId: line.Id || null,
      },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PAYMENT SYNC: QBO → App
// ═══════════════════════════════════════════════════════════════════════════════

export async function syncPaymentsFromQBO(): Promise<SyncResult> {
  const settings = await getSyncSettings();
  if (!settings.syncPayments) {
    return { entity: "payment", direction: "qbo_to_app", created: 0, updated: 0, skipped: 0, errors: 0, total: 0 };
  }

  const { accessToken, realmId } = await authenticatedClient();

  const query = buildDeltaQuery("Payment", settings.lastPaymentSync);
  const result = await makeQBRequest(accessToken, realmId, "GET", `query?query=${encodeURIComponent(query)}`);
  const qbPayments = result.QueryResponse?.Payment || [];

  let created = 0, updated = 0, skipped = 0, errors = 0;
  const errorDetails: string[] = [];
  let latestUpdate: Date | null = null;

  for (const qb of qbPayments) {
    try {
      const qbId = qb.Id;

      if (qb.MetaData?.LastUpdatedTime) {
        const ts = new Date(qb.MetaData.LastUpdatedTime);
        if (!latestUpdate || ts > latestUpdate) latestUpdate = ts;
      }

      const linkedTxns = (qb.Line || []).flatMap((l: any) =>
        (l.LinkedTxn || []).filter((t: any) => t.TxnType === "Invoice")
      );

      if (linkedTxns.length === 0) {
        await logSync("payment", "qbo_to_app", "skip", { qbId, message: "No linked invoice" });
        skipped++;
        continue;
      }

      for (const txn of linkedTxns) {
        const invoice = await prisma.invoice.findFirst({ where: { qbInvoiceId: txn.TxnId } });

        if (!invoice) {
          await logSync("payment", "qbo_to_app", "skip", {
            qbId, message: `Linked invoice QB ID ${txn.TxnId} not found locally`,
          });
          skipped++;
          continue;
        }

        const existing = await prisma.payment.findFirst({
          where: { qbPaymentId: qbId, invoiceId: invoice.id },
        });

        const paymentData = {
          invoiceId: invoice.id,
          amount: new Decimal(Number(qb.TotalAmt ?? 0)),
          paymentDate: new Date(qb.TxnDate || new Date()),
          method: mapPaymentMethod(qb.PaymentMethodRef?.name),
          reference: qb.PaymentRefNum || null,
          qbPaymentId: qbId,
          qbSyncToken: qb.SyncToken,
        };

        if (existing) {
          await prisma.payment.update({ where: { id: existing.id }, data: paymentData });
          await logSync("payment", "qbo_to_app", "update", { entityId: existing.id, qbId });
          updated++;
        } else {
          const newPmt = await prisma.payment.create({ data: paymentData });
          await updateInvoiceBalance(invoice.id);
          await logSync("payment", "qbo_to_app", "create", { entityId: newPmt.id, qbId });
          created++;
        }
      }
    } catch (err: any) {
      const msg = `Payment QB-${qb.Id}: ${err.message}`;
      errorDetails.push(msg);
      await logSync("payment", "qbo_to_app", "error", { qbId: qb.Id, message: msg });
      errors++;
    }
  }

  if (latestUpdate) {
    await prisma.quickBooksSyncSetting.update({
      where: { id: settings.id },
      data: { lastPaymentSync: latestUpdate },
    });
  }

  return { entity: "payment", direction: "qbo_to_app", created, updated, skipped, errors, total: qbPayments.length, errorDetails: errorDetails.length > 0 ? errorDetails : undefined };
}

function mapPaymentMethod(qbMethod?: string): "CARD" | "DIRECT_DEBIT" | "CASH" | "BANK_TRANSFER" {
  if (!qbMethod) return "BANK_TRANSFER";
  const lower = qbMethod.toLowerCase();
  if (lower.includes("card") || lower.includes("credit") || lower.includes("debit")) return "CARD";
  if (lower.includes("cash")) return "CASH";
  if (lower.includes("direct debit") || lower.includes("dd")) return "DIRECT_DEBIT";
  return "BANK_TRANSFER";
}

async function updateInvoiceBalance(invoiceId: string) {
  const payments = await prisma.payment.findMany({ where: { invoiceId }, select: { amount: true } });
  const totalPaid = payments.reduce((sum, p) => sum.plus(p.amount), new Decimal(0));
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { total: true } });
  if (!invoice) return;

  const balance = new Decimal(Number(invoice.total)).minus(totalPaid);
  const status = balance.lte(0) ? "PAID" : balance.lt(invoice.total) ? "PARTIAL" : "SENT";

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { balanceDue: balance.lt(0) ? new Decimal(0) : balance, status },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  APP → QBO: Limited Updates (PrivateNote only)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sparse update: only writes PrivateNote to QBO.
 * Does NOT modify any financial fields.
 */
export async function updateInvoiceNoteInQBO(invoiceId: string, privateNote: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { qbInvoiceId: true, qbSyncToken: true },
  });
  if (!invoice?.qbInvoiceId) throw new Error("Invoice is not linked to QuickBooks");

  const { accessToken, realmId } = await authenticatedClient();

  const update = {
    Id: invoice.qbInvoiceId,
    SyncToken: invoice.qbSyncToken || "0",
    sparse: true,
    PrivateNote: privateNote,
  };

  const response = await makeQBRequest(accessToken, realmId, "POST", "invoice", update);

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { qbSyncToken: response.Invoice.SyncToken, qbPrivateNote: privateNote },
  });

  await logSync("invoice", "app_to_qbo", "update", {
    entityId: invoiceId, qbId: invoice.qbInvoiceId, message: "Updated PrivateNote",
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FULL SYNC ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Runs a full delta sync for all enabled entities.
 * Order: Customers → Items → Invoices → Payments (dependency order)
 */
export async function runFullSync(): Promise<{
  status: "completed" | "partial" | "failed";
  results: Record<string, SyncResult>;
  timestamp: string;
}> {
  const results: Record<string, SyncResult> = {};
  let hasErrors = false;

  const syncSteps: Array<{ key: string; fn: () => Promise<SyncResult> }> = [
    { key: "customers", fn: syncCustomersFromQBO },
    { key: "items", fn: syncItemsFromQBO },
    { key: "invoices", fn: syncInvoicesFromQBO },
    { key: "payments", fn: syncPaymentsFromQBO },
  ];

  for (const step of syncSteps) {
    try {
      results[step.key] = await step.fn();
      if (results[step.key].errors > 0) hasErrors = true;
    } catch (err: any) {
      results[step.key] = {
        entity: step.key, direction: "qbo_to_app",
        created: 0, updated: 0, skipped: 0, errors: 1, total: 0,
        errorDetails: [err.message],
      };
      hasErrors = true;
    }
  }

  // Record when the sync actually ran
  const settings = await getSyncSettings();
  await prisma.quickBooksSyncSetting.update({
    where: { id: settings.id },
    data: { lastSyncRanAt: new Date() },
  });

  return { status: hasErrors ? "partial" : "completed", results, timestamp: new Date().toISOString() };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RESET SYNC (for re-importing everything)
// ═══════════════════════════════════════════════════════════════════════════════

export async function resetSyncTimestamps(): Promise<void> {
  const settings = await getSyncSettings();
  await prisma.quickBooksSyncSetting.update({
    where: { id: settings.id },
    data: { lastCustomerSync: null, lastItemSync: null, lastInvoiceSync: null, lastPaymentSync: null, lastSyncRanAt: null },
  });
}
