"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function MobileRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    // Detect mobile/tablet devices - including iPads and Android tablets
    const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(navigator.userAgent);
    
    // Also check for touch support and small/medium screens (tablets)
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth < 1024; // Less than lg breakpoint
    
    const shouldUseMobileView = (isMobile || (isTouchDevice && isSmallScreen));
    
    // If mobile/tablet and not already on mobile route, redirect to mobile view
    if (shouldUseMobileView && !pathname.startsWith("/mobile") && !pathname.startsWith("/auth")) {
      router.push("/mobile/schedule");
    }
  }, [isMounted, pathname, router]);

  return null;
}
