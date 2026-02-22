"use client";

import { useEffect, useState } from "react";

export function ThemeDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("appearance");
    const computedStyles = {
      sidebar: getComputedStyle(document.documentElement).getPropertyValue('--color-sidebar'),
      sidebarFont: getComputedStyle(document.documentElement).getPropertyValue('--color-sidebar-font'),
      card: getComputedStyle(document.documentElement).getPropertyValue('--color-card'),
      background: getComputedStyle(document.documentElement).getPropertyValue('--color-background'),
    };

    setDebugInfo({
      localStorage: stored ? JSON.parse(stored) : null,
      computedStyles,
      userAgent: navigator.userAgent,
    });
  }, []);

  if (!debugInfo) return null;

  return (
    <div className="card space-y-3">
      <h3 className="text-sm font-semibold">Theme Debug Info</h3>
      <div className="space-y-2 text-xs font-mono">
        <div>
          <p className="font-semibold text-slate-700">LocalStorage:</p>
          <pre className="mt-1 overflow-auto rounded bg-slate-100 p-2">
            {JSON.stringify(debugInfo.localStorage, null, 2)}
          </pre>
        </div>
        <div>
          <p className="font-semibold text-slate-700">Applied CSS Variables:</p>
          <pre className="mt-1 overflow-auto rounded bg-slate-100 p-2">
            {JSON.stringify(debugInfo.computedStyles, null, 2)}
          </pre>
        </div>
        <div>
          <p className="font-semibold text-slate-700">User Agent:</p>
          <p className="mt-1 rounded bg-slate-100 p-2 text-slate-600">
            {debugInfo.userAgent}
          </p>
        </div>
      </div>
      <button
        onClick={() => {
          localStorage.clear();
          window.location.reload();
        }}
        className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
      >
        Clear Cache & Reload
      </button>
    </div>
  );
}
