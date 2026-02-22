"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  label?: string;
  fallbackUrl?: string;
  className?: string;
}

export function BackButton({ 
  label = "Back", 
  fallbackUrl = "/dashboard",
  className = ""
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    // Try to go back in history
    if (window.history.length > 1) {
      router.back();
    } else {
      // Fallback to specified URL if no history
      router.push(fallbackUrl);
    }
  };

  return (
    <button
      onClick={handleBack}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
