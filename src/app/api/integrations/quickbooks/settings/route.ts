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
    // Get or create sync settings
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

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Failed to fetch sync settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { syncCustomers, syncInvoices, syncPayments, syncItems, autoSync, syncIntervalMins } = body;

    // Get or create settings
    let settings = await prisma.quickBooksSyncSetting.findFirst();
    
    if (settings) {
      settings = await prisma.quickBooksSyncSetting.update({
        where: { id: settings.id },
        data: {
          syncCustomers: syncCustomers ?? settings.syncCustomers,
          syncInvoices: syncInvoices ?? settings.syncInvoices,
          syncPayments: syncPayments ?? settings.syncPayments,
          syncItems: syncItems ?? settings.syncItems,
          autoSync: autoSync ?? settings.autoSync,
          syncIntervalMins: syncIntervalMins ?? settings.syncIntervalMins,
        },
      });
    } else {
      settings = await prisma.quickBooksSyncSetting.create({
        data: {
          syncCustomers: syncCustomers ?? true,
          syncInvoices: syncInvoices ?? true,
          syncPayments: syncPayments ?? true,
          syncItems: syncItems ?? true,
          autoSync: autoSync ?? false,
          syncIntervalMins: syncIntervalMins ?? 30,
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Failed to update sync settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
