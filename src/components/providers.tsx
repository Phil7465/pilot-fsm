"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { SessionProvider } from "next-auth/react";
import { AutoSyncProvider } from "@/components/integrations/auto-sync-provider";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: true, // Auto-refresh when tab/app comes into focus
            refetchOnReconnect: true, // Refresh when network reconnects
            staleTime: 1000 * 30, // Data is fresh for 30 seconds
            retry: 1,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <AutoSyncProvider>{children}</AutoSyncProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
