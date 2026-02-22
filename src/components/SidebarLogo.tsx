"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Props {
  companyName?: string;
  companyNameSize?: string;
  companyNameWeight?: string;
}

export function SidebarLogo({ 
  companyName = "Pilot Field Service Pro",
  companyNameSize = "text-xl",
  companyNameWeight = "font-semibold"
}: Props) {
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    const updateLogo = () => {
      const stored = localStorage.getItem("appearance");
      if (stored) {
        try {
          const settings = JSON.parse(stored);
          setLogo(settings.logo || null);
        } catch (e) {
          console.error("Failed to parse appearance settings:", e);
        }
      } else {
        setLogo(null);
      }
    };

    // Update on mount
    updateLogo();

    // Listen for theme updates
    const handleThemeUpdate = () => {
      updateLogo();
    };

    window.addEventListener("themeUpdated", handleThemeUpdate);

    return () => {
      window.removeEventListener("themeUpdated", handleThemeUpdate);
    };
  }, []);

  if (logo) {
    return (
      <Link href="/" className="flex flex-col items-center gap-2">
        <span className={`text-center ${companyNameSize} ${companyNameWeight}`} style={{ color: 'var(--color-sidebar-font, #475569)' }}>
          {companyName}
        </span>
        <img src={logo} alt="Logo" className="h-24 w-auto object-contain" />
      </Link>
    );
  }

  return (
    <Link href="/" className={`block text-center ${companyNameSize} ${companyNameWeight}`} style={{ color: 'var(--color-sidebar-font, #475569)' }}>
      {companyName}
    </Link>
  );
}
