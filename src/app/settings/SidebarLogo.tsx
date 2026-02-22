"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function SidebarLogo() {
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    const savedLogo = localStorage.getItem("app_logo");
    if (savedLogo) {
      setLogo(savedLogo);
    }
  }, []);

  return (
    <Link href="/" className="block text-xl font-semibold text-slate-900">
      {logo ? (
        <img src={logo} alt="Logo" className="h-12 w-auto object-contain" />
      ) : (
        "Pilot Field Service Pro"
      )}
    </Link>
  );
}