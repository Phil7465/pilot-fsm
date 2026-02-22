"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

const PROTECTED_PATHS = [
  "/dashboard",
  "/customers",
  "/jobs",
  "/invoices",
  "/payments",
  "/schedule",
  "/staff",
  "/services",
  "/settings",
  "/account",
  "/integrations",
  "/mobile",
];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Check if current path is protected
    const isProtectedPath = PROTECTED_PATHS.some(
      (path) => pathname.startsWith(path)
    );

    // If not authenticated and on a protected path, redirect to sign in
    if (status === "unauthenticated" && isProtectedPath) {
      router.push("/api/auth/signin");
    }
  }, [status, pathname, router]);

  // Show loading state while checking auth
  if (status === "loading") {
    return null;
  }

  return <>{children}</>;
}
