"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function NavigationHandler() {
  const router = useRouter();

  useEffect(() => {
    // Handle browser back/forward navigation
    const handlePopState = () => {
      router.refresh();
    };

    // Handle page show event (fires when navigating back to cached page)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Page was loaded from bfcache, force refresh
        router.refresh();
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [router]);

  return null;
}
