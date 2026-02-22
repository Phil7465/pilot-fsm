"use client";

import { useState } from "react";

export function ManualSyncButtons() {
  const [syncing, setSyncing] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  async function testConnection() {
    setSyncing('test');
    setResult(null);

    try {
      const res = await fetch('/api/integrations/quickbooks/test-connection');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.details || 'Connection test failed');
      }

      setResult({ 
        type: 'success', 
        message: `Connected to ${data.companyName} (${data.environment})` 
      });
    } catch (error: any) {
      setResult({ type: 'error', message: error.message });
    } finally {
      setSyncing(null);
    }
  }

  async function syncEntity(entity: string, label: string) {
    setSyncing(entity);
    setResult(null);

    try {
      const res = await fetch('/api/integrations/quickbooks/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to sync ${label}`);

      const r = data.result;
      if (r.results) {
        // Full sync result
        const parts: string[] = [];
        for (const [key, val] of Object.entries(r.results) as any) {
          if (val.created > 0 || val.updated > 0 || val.errors > 0) {
            parts.push(`${key}: ${val.created} new, ${val.updated} updated${val.errors > 0 ? `, ${val.errors} errors` : ''}`);
          }
        }
        setResult({
          type: r.status === 'completed' ? 'success' : 'error',
          message: parts.length > 0 ? parts.join('\n') : 'No changes found',
        });
      } else if (r.created !== undefined) {
        // Single entity result
        const parts: string[] = [];
        if (r.created > 0) parts.push(`${r.created} new`);
        if (r.updated > 0) parts.push(`${r.updated} updated`);
        if (r.skipped > 0) parts.push(`${r.skipped} skipped`);
        if (r.errors > 0) parts.push(`${r.errors} errors`);
        setResult({
          type: r.errors > 0 ? 'error' : 'success',
          message: `${label}: ${parts.join(', ') || 'No changes'} (${r.total} from QBO)${r.errorDetails ? '\n' + r.errorDetails.join('\n') : ''}`,
        });
      } else {
        setResult({ type: 'success', message: r.message || `${label} sync complete` });
      }
    } catch (error: any) {
      setResult({ type: 'error', message: error.message });
    } finally {
      setSyncing(null);
    }
  }

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Sync from QuickBooks</h2>
        <p className="text-sm text-slate-500">
          Pull financial data from QuickBooks into your app. QBO is the source of truth.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">Connection</h3>
          <button
            onClick={testConnection}
            disabled={!!syncing}
            className="btn-primary"
          >
            {syncing === 'test' ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">Pull from QuickBooks</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => syncEntity('customer', 'Customers')}
              disabled={!!syncing}
              className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {syncing === 'customer' ? 'Syncing...' : 'Sync Customers'}
            </button>
            <button
              onClick={() => syncEntity('item', 'Items')}
              disabled={!!syncing}
              className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
            >
              {syncing === 'item' ? 'Syncing...' : 'Sync Items'}
            </button>
            <button
              onClick={() => syncEntity('invoice', 'Invoices')}
              disabled={!!syncing}
              className="rounded-xl bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
            >
              {syncing === 'invoice' ? 'Syncing...' : 'Sync Invoices'}
            </button>
            <button
              onClick={() => syncEntity('payment', 'Payments')}
              disabled={!!syncing}
              className="rounded-xl bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600 disabled:opacity-50"
            >
              {syncing === 'payment' ? 'Syncing...' : 'Sync Payments'}
            </button>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">Full Sync</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => syncEntity('all', 'All Entities')}
              disabled={!!syncing}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {syncing === 'all' ? 'Syncing All...' : 'Sync All from QBO'}
            </button>
            <button
              onClick={() => syncEntity('reset', 'Reset')}
              disabled={!!syncing}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {syncing === 'reset' ? 'Resetting...' : 'Reset Sync Timestamps'}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Reset forces the next sync to re-import all records from QBO
          </p>
        </div>
      </div>

      {result && (
        <div
          className={`rounded-xl border p-4 ${
            result.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <p className="text-sm font-medium whitespace-pre-wrap">{result.message}</p>
        </div>
      )}
    </div>
  );
}
