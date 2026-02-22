import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QuickBooksConnectButton } from "@/components/integrations/quickbooks-connect-button";
import { AccountMappingList } from "@/components/integrations/account-mapping-list";
import { SyncSettingsForm } from "@/components/integrations/sync-settings-form";
import { SyncStatusDashboard } from "@/components/integrations/sync-status-dashboard";
import { ManualSyncButtons } from "@/components/integrations/manual-sync-buttons";

export const dynamic = "force-dynamic";

export default async function QuickBooksPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const qbCredential = await prisma.quickBooksCredential.findFirst();

  const isConnected = !!(
    qbCredential?.realmId &&
    qbCredential?.accessToken &&
    qbCredential?.refreshToken
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">QuickBooks Integration</h1>
        <p className="mt-1 text-sm text-slate-500">
          Connect your QuickBooks account to sync customers, invoices, and payments.
        </p>
      </div>

      <div className="card space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Connection Status</h2>
            <p className="mt-1 text-sm text-slate-500">
              {isConnected
                ? "Your QuickBooks account is connected."
                : "Connect your QuickBooks account to begin syncing data."}
            </p>
          </div>
          <div
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              isConnected
                ? "bg-green-100 text-green-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {isConnected ? "Connected" : "Not Connected"}
          </div>
        </div>

        {isConnected && qbCredential?.realmId && (
          <div className="rounded-xl bg-slate-50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Company ID:</span>
              <span className="font-mono">{qbCredential.realmId}</span>
            </div>
          </div>
        )}

        <QuickBooksConnectButton isConnected={isConnected} />
      </div>

      {isConnected && <SyncStatusDashboard />}

      {isConnected && <ManualSyncButtons />}

      <div className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Sync Settings</h2>
          <p className="text-sm text-slate-500">
            Configure what data to synchronize with QuickBooks.
          </p>
        </div>

        <SyncSettingsForm />
      </div>

      {isConnected && (
        <div className="card space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Chart of Accounts</h2>
            <p className="text-sm text-slate-500">
              QuickBooks accounts synced from your company file.
            </p>
          </div>
          <AccountMappingList />
        </div>
      )}
    </div>
  );
}
