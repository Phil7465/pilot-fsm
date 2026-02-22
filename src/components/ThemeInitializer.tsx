"use client";

import { useEffect } from "react";

function applyThemeSettings() {
  const stored = localStorage.getItem("appearance");
  if (stored) {
    try {
      const settings = JSON.parse(stored);
      if (settings.sidebarBg) {
        document.documentElement.style.setProperty("--color-sidebar", settings.sidebarBg);
      }
      if (settings.sidebarFont) {
        document.documentElement.style.setProperty("--color-sidebar-font", settings.sidebarFont);
      }
      if (settings.cardBg) {
        document.documentElement.style.setProperty("--color-card", settings.cardBg);
      }
      if (settings.background) {
        document.documentElement.style.setProperty("--color-background", settings.background);
      }
      
      // Force a reflow to ensure styles are applied
      document.documentElement.offsetHeight;
    } catch (e) {
      console.error("Failed to parse appearance settings:", e);
    }
  }
}

export function ThemeInitializer() {
  useEffect(() => {
    // Apply immediately on mount
    applyThemeSettings();
    
    // Apply again after a short delay (for cached pages)
    const timeoutId = setTimeout(() => {
      applyThemeSettings();
    }, 100);

    // Listen for custom theme update events
    const handleThemeUpdate = () => {
      applyThemeSettings();
    };

    // Listen for storage events (cross-tab updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "appearance") {
        applyThemeSettings();
      }
    };

    // Apply when page becomes visible (tab switching)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        applyThemeSettings();
      }
    };

    window.addEventListener("themeUpdated", handleThemeUpdate);
    window.addEventListener("storage", handleStorageChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("themeUpdated", handleThemeUpdate);
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
