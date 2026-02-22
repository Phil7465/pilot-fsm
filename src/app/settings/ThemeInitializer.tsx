"use client";

import { useEffect } from "react";

export function ThemeInitializer() {
  useEffect(() => {
    const savedTheme = localStorage.getItem("app_theme");
    if (savedTheme) {
      const colors = JSON.parse(savedTheme);
      Object.entries(colors).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--color-${key}`, value as string);
      });
    }
  }, []);

  return (
    <style dangerouslySetInnerHTML={{ __html: `
      :root {
        --color-sidebar: #ffffff;
        --color-card: #ffffff;
        --color-background: #f8fafc;
      }
      .card {
        background-color: var(--color-card) !important;
      }
    `}} />
  );
}