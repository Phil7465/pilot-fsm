import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runFullSync } from "@/lib/quickbooks/sync";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // CRITICAL: If your app supports multiple companies, you MUST filter by tenantId here.
    // We assume session.user has a tenantId. If not, adjust the where clause accordingly.
    const settings = await prisma.quickBooksSyncSetting.findFirst({
      // where: { tenantId: session.user.tenantId }
    });
    
    if (!settings) {
      return NextResponse.json({ error: "Sync settings not configured" }, { status: 400 });
    }

    // 3. Concurrency Control: Prevent race conditions
    const ONE_HOUR = 60 * 60 * 1000;
    const isStuck = settings.isSyncing && 
      (!settings.lastSyncStartedAt || Date.now() - settings.lastSyncStartedAt.getTime() > ONE_HOUR);

    if (settings.isSyncing && !isStuck) {
       return NextResponse.json({ error: "Sync already in progress" }, { status: 409 });
    }

    // Lock the sync process
    await prisma.quickBooksSyncSetting.update({
      where: { id: settings.id },
      data: { isSyncing: true, lastSyncStartedAt: new Date() }
    });

    try {
      // Run full QBO → App delta sync
      const syncResult = await runFullSync();

      revalidatePath("/customers");
      revalidatePath("/invoices");
      revalidatePath("/payments");
      revalidatePath("/dashboard");
      revalidatePath("/settings");

      return NextResponse.json(syncResult || { success: true });
    } finally {
      // 4. Cleanup: Always release the lock, even if sync fails
      await prisma.quickBooksSyncSetting.update({
        where: { id: settings.id },
        data: { isSyncing: false }
      });
    }
  } catch (error: any) {
    console.error("Auto-sync error:", error);
    
    // Improve error safety: Ensure we extract the message properly
    const errorMessage = error instanceof Error ? error.message : "Auto-sync failed";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
