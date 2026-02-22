"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

export function AutoSyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;

    // Check settings and start interval
    async function checkAndStartSync() {
      try {
        const res = await fetch("/api/integrations/quickbooks/settings");
        if (!res.ok) return;

        const data = await res.json();
        const settings = data.settings;

        if (!settings?.autoSync) {
          // Auto-sync disabled, clear any existing interval
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }

        const intervalMs = (settings.syncIntervalMins || 30) * 60 * 1000;

        // Clear existing interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }

        // Run sync function
        async function runSync() {
          try {
            console.log("[AutoSync] Running QBO → App sync...");
            const syncRes = await fetch("/api/integrations/quickbooks/auto-sync", {
              method: "POST",
            });

            if (syncRes.ok) {
              const result = await syncRes.json();
              const timestamp = new Date().toLocaleTimeString();
              setLastSync(timestamp);
              console.log(`[AutoSync] Completed at ${timestamp}:`, result);
            } else {
              const err = await syncRes.json();
              console.error("[AutoSync] Failed:", err.error);
            }
          } catch (err) {
            console.error("[AutoSync] Error:", err);
          }
        }

        // Run immediately on first load
        runSync();

        // Set interval for future syncs
        intervalRef.current = setInterval(runSync, intervalMs);
        console.log(`[AutoSync] Scheduled every ${settings.syncIntervalMins} minutes`);
      } catch (err) {
        console.error("[AutoSync] Failed to load settings:", err);
      }
    }

    checkAndStartSync();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [session]);

  return <>{children}</>;
}
