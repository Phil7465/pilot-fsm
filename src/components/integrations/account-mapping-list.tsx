"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type QuickBooksAccount = {
  id: string;
  quickbooksId: string;
  name: string;
  fullyQualifiedName: string;
  accountType: string;
  accountSubType: string | null;
  active: boolean;
};

export function AccountMappingList() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<QuickBooksAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/quickbooks/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
        setCached(data.cached || false);
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    } finally {
      setLoading(false);
    }
  }

  async function refreshAccounts() {
    setSyncing(true);
    try {
      // Force refresh by clearing cache first
      await fetch("/api/integrations/quickbooks/accounts/refresh", {
        method: "POST",
      });
      await fetchAccounts();
    } catch (error) {
      console.error("Failed to refresh accounts:", error);
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <p className="text-sm text-slate-500">Loading QuickBooks accounts...</p>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="card space-y-3">
        <p className="text-sm text-slate-500">
          No accounts found. Make sure QuickBooks is connected.
        </p>
        <button onClick={fetchAccounts} className="btn-primary">
          Fetch Accounts
        </button>
      </div>
    );
  }

  const incomeAccounts = accounts.filter((acc) =>
    ["Income", "Other Income"].includes(acc.accountType)
  );
  const expenseAccounts = accounts.filter((acc) =>
    ["Expense", "Other Expense", "Cost of Goods Sold"].includes(acc.accountType)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600">
            {accounts.length} accounts synced
            {cached && " (cached)"}
          </p>
        </div>
        <button
          onClick={refreshAccounts}
          disabled={syncing}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          {syncing ? "Refreshing..." : "Refresh from QuickBooks"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-3">
          <h3 className="font-semibold text-slate-900">Income Accounts</h3>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {incomeAccounts.map((account) => (
              <div
                key={account.id}
                className="rounded-lg border border-slate-100 bg-slate-50 p-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {account.name}
                    </p>
                    {account.fullyQualifiedName !== account.name && (
                      <p className="text-xs text-slate-500">
                        {account.fullyQualifiedName}
                      </p>
                    )}
                  </div>
                  <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    {account.accountType}
                  </span>
                </div>
                {account.accountSubType && (
                  <p className="mt-1 text-xs text-slate-400">
                    {account.accountSubType}
                  </p>
                )}
              </div>
            ))}
            {incomeAccounts.length === 0 && (
              <p className="text-sm text-slate-400">No income accounts found</p>
            )}
          </div>
        </div>

        <div className="card space-y-3">
          <h3 className="font-semibold text-slate-900">Expense Accounts</h3>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {expenseAccounts.map((account) => (
              <div
                key={account.id}
                className="rounded-lg border border-slate-100 bg-slate-50 p-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {account.name}
                    </p>
                    {account.fullyQualifiedName !== account.name && (
                      <p className="text-xs text-slate-500">
                        {account.fullyQualifiedName}
                      </p>
                    )}
                  </div>
                  <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                    {account.accountType}
                  </span>
                </div>
                {account.accountSubType && (
                  <p className="mt-1 text-xs text-slate-400">
                    {account.accountSubType}
                  </p>
                )}
              </div>
            ))}
            {expenseAccounts.length === 0 && (
              <p className="text-sm text-slate-400">No expense accounts found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
