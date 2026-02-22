"use client";

import { useEffect, useState } from "react";

type EntityStatus = {
  total: number;
  synced: number;
  localOnly: number;
};

type SyncLogEntry = {
  id: string;
  entity: string;
  direction: string;
  action: string;
  message: string | null;
  createdAt: string;
};

type SyncStatus = {
  customers: EntityStatus;
  items: EntityStatus;
  invoices: EntityStatus;
  payments: EntityStatus;
  lastSyncRanAt?: string | null;
  recentLogs?: SyncLogEntry[];
};

export function SyncStatusDashboard() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/quickbooks/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
      }
    } catch (error) {
      console.error("Failed to fetch sync status:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchStatus();
    setRefreshing(false);
  }

  async function handlePushAll() {
    setPushing(true);
    setPushResult(null);
    try {
      const res = await fetch("/api/integrations/quickbooks/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity: "all" }),
      });
      const data = await res.json();
      if (res.ok) {
        const r = data.result?.results || {};
        const custCreated = r.customers?.created || 0;
        const invCreated = r.invoices?.created || 0;
        const custErrors = r.customers?.errors || 0;
        const invErrors = r.invoices?.errors || 0;
        setPushResult(
          `Pushed: ${custCreated} customers, ${invCreated} invoices` +
          (custErrors + invErrors > 0 ? ` (${custErrors + invErrors} errors)` : "")
        );
        await fetchStatus();
      } else {
        setPushResult(`Push failed: ${data.error}`);
      }
    } catch (err: any) {
      setPushResult(`Push failed: ${err.message}`);
    } finally {
      setPushing(false);
    }
  }

  if (loading || !status) {
    return (
      <div className="card">
        <p className="text-sm text-slate-500">Loading sync status...</p>
      </div>
    );
  }

  const totalLocalOnly =
    status.customers.localOnly +
    status.items.localOnly +
    status.invoices.localOnly +
    status.payments.localOnly;

  const entities: Array<{ key: keyof SyncStatus; label: string; color: string }> = [
    { key: "customers", label: "Customers", color: "bg-blue-500" },
    { key: "items", label: "Items / Services", color: "bg-indigo-500" },
    { key: "invoices", label: "Invoices", color: "bg-green-500" },
    { key: "payments", label: "Payments", color: "bg-purple-500" },
  ];

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Sync Status</h2>
          <p className="text-sm text-slate-500">
            Bidirectional sync: QBO ↔ App
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalLocalOnly > 0 && (
            <button
              onClick={handlePushAll}
              disabled={pushing}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {pushing ? "Pushing..." : `Push ${totalLocalOnly} to QBO`}
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {pushResult && (
        <div className={`rounded-lg px-3 py-2 text-sm ${
          pushResult.includes("failed") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
        }`}>
          {pushResult}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {entities.map(({ key, label, color }) => {
          const entity = status[key] as EntityStatus;
          if (!entity) return null;
          return (
            <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700">{label}</h3>
                <span className="text-lg font-bold text-slate-800">{entity.total}</span>
              </div>
              <p className="text-xs text-slate-600">
                <span className={`inline-block h-2 w-2 rounded-full ${color} mr-1`} />
                {entity.synced} synced with QBO
              </p>
              {entity.localOnly > 0 && (
                <p className="text-xs text-amber-600 mt-0.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-400 mr-1" />
                  {entity.localOnly} pending push to QBO
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Last sync time */}
      {status.lastSyncRanAt && (
        <p className="text-xs text-slate-500">
          Last synced: {new Date(status.lastSyncRanAt).toLocaleString()}
        </p>
      )}

      {/* Recent Sync Log */}
      {status.recentLogs && status.recentLogs.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Recent Sync Activity</h3>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Time</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Entity</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Action</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Message</th>
                </tr>
              </thead>
              <tbody>
                {status.recentLogs.map((log) => (
                  <tr key={log.id} className="border-t border-slate-100">
                    <td className="px-3 py-1.5 text-slate-500">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="px-3 py-1.5 capitalize">{log.entity}</td>
                    <td className="px-3 py-1.5">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        log.action === "create" ? "bg-green-100 text-green-700" :
                        log.action === "update" ? "bg-blue-100 text-blue-700" :
                        log.action === "error" ? "bg-red-100 text-red-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-slate-600 truncate max-w-[200px]">
                      {log.message || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
