"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  isConnected: boolean;
}

export function QuickBooksConnectButton({ isConnected }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/quickbooks/auth-url");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Failed to initiate QuickBooks connection", err);
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Are you sure you want to disconnect QuickBooks?")) {
      return;
    }

    setLoading(true);
    try {
      await fetch("/api/integrations/quickbooks/disconnect", {
        method: "POST",
      });
      router.refresh();
    } catch (err) {
      console.error("Failed to disconnect QuickBooks", err);
    } finally {
      setLoading(false);
    }
  }

  if (isConnected) {
    return (
      <button
        onClick={handleDisconnect}
        disabled={loading}
        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        {loading ? "Disconnecting..." : "Disconnect QuickBooks"}
      </button>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="btn-primary"
    >
      {loading ? "Connecting..." : "Connect to QuickBooks"}
    </button>
  );
}
