"use client";

import { useState } from "react";

export function QuickBooksCard({ connected }: { connected: boolean }) {
  const [status, setStatus] = useState<string | null>(null);

  async function handleConnect() {
    setStatus("Redirecting to QuickBooks...");
    const res = await fetch("/api/integrations/quickbooks/connect");
    const data = await res.json();
    window.location.href = data.url;
  }

  return (
    <div className="card space-y-3">
      <div>
        <h2 className="text-lg font-semibold">QuickBooks Online</h2>
        <p className="text-sm text-slate-500">Sync customers, invoices, payments.</p>
      </div>
      <p className="text-sm">Status: {connected ? "Connected" : "Not connected"}</p>
      <button onClick={handleConnect} className="btn-primary" disabled={connected}>
        {connected ? "Connected" : "Connect to QuickBooks"}
      </button>
      {status && <p className="text-xs text-slate-500">{status}</p>}
    </div>
  );
}
