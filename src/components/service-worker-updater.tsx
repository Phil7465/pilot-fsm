"use client";

import { useEffect, useState } from "react";

export function ServiceWorkerUpdater() {
  const [needsUpdate, setNeedsUpdate] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.addEventListener("updatefound", () => {
            setNeedsUpdate(true);
          });
          
          // Check for updates
          registration.update();
        });
      });
    }
  }, []);

  const handleUpdate = async () => {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
      
      // Clear all caches
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      }
      
      // Reload the page
      window.location.reload();
    }
  };

  if (!needsUpdate) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-brand-600 p-4 text-white shadow-lg md:left-auto md:right-4 md:w-96">
      <p className="mb-2 font-semibold">Update Available</p>
      <p className="mb-3 text-sm opacity-90">
        A new version is available. Refresh to get the latest features.
      </p>
      <button
        onClick={handleUpdate}
        className="w-full rounded-lg bg-white px-4 py-2 font-medium text-brand-600 transition hover:bg-brand-50"
      >
        Refresh Now
      </button>
    </div>
  );
}
