import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [
      totalCustomers,
      syncedCustomers,
      totalItems,
      syncedItems,
      totalInvoices,
      syncedInvoices,
      totalPayments,
      syncedPayments,
      settings,
      recentLogs,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { qbCustomerId: { not: null } } }),
      prisma.serviceTemplate.count(),
      prisma.serviceTemplate.count({ where: { qbItemId: { not: null } } }),
      prisma.invoice.count(),
      prisma.invoice.count({ where: { qbInvoiceId: { not: null } } }),
      prisma.payment.count(),
      prisma.payment.count({ where: { qbPaymentId: { not: null } } }),
      prisma.quickBooksSyncSetting.findFirst(),
      prisma.syncLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const status = {
      customers: {
        total: totalCustomers,
        synced: syncedCustomers,
        localOnly: totalCustomers - syncedCustomers,
      },
      items: {
        total: totalItems,
        synced: syncedItems,
        localOnly: totalItems - syncedItems,
      },
      invoices: {
        total: totalInvoices,
        synced: syncedInvoices,
        localOnly: totalInvoices - syncedInvoices,
      },
      payments: {
        total: totalPayments,
        synced: syncedPayments,
        localOnly: totalPayments - syncedPayments,
      },
      lastSyncRanAt: settings?.lastSyncRanAt?.toISOString() || null,
      recentLogs,
    };

    return NextResponse.json({ status });
  } catch (error) {
    console.error("Failed to fetch sync status:", error);
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
