import { prisma } from "@/lib/prisma";

export async function getSyncSettings() {
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

export async function shouldSyncEntity(
  entityType: "customer" | "invoice" | "payment" | "item"
): Promise<boolean> {
  const settings = await getSyncSettings();
  
  switch (entityType) {
    case "customer":
      return settings.syncCustomers;
    case "invoice":
      return settings.syncInvoices;
    case "payment":
      return settings.syncPayments;
    case "item":
      return settings.syncItems;
    default:
      return false;
  }
}
