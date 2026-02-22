"use client";

import { useEffect } from "react";

export function ErrorLogger() {
  useEffect(() => {
    const logError = async (message: string, stack?: string) => {
      try {
        await fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level: "error",
            message,
            stack,
            url: window.location.href,
            userAgent: navigator.userAgent,
          }),
        });
      } catch (e) {
        console.error("Failed to log error:", e);
      }
    };

    // Catch unhandled errors
    const errorHandler = (event: ErrorEvent) => {
      logError(event.message, event.error?.stack);
    };

    // Catch unhandled promise rejections
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      logError(
        `Unhandled Promise Rejection: ${event.reason}`,
        event.reason?.stack
      );
    };

    window.addEventListener("error", errorHandler);
    window.addEventListener("unhandledrejection", rejectionHandler);

    return () => {
      window.removeEventListener("error", errorHandler);
      window.removeEventListener("unhandledrejection", rejectionHandler);
    };
  }, []);

  return null;
}
