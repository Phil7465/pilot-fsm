import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request as any });
  const { pathname } = request.nextUrl;

  // Detect mobile/tablet devices and redirect to mobile view
  const userAgent = request.headers.get("user-agent") || "";
  const isMobileDevice = /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(userAgent);
  
  // If it's a mobile/tablet device and not already on mobile or auth routes
  if (isMobileDevice && !pathname.startsWith("/mobile") && !pathname.startsWith("/auth") && token) {
    return NextResponse.redirect(new URL("/mobile/schedule", request.url));
  }

  // Allow access to auth pages
  if (pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }

  // Require authentication for protected routes
  const protectedPaths = [
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

  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  if (isProtectedPath && !token) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Role-based routing
  if (token) {
    const role = token.role as string;

    // Redirect authenticated users from root to dashboard or schedule
    if (pathname === "/") {
      if (role === "DRIVER") {
        return NextResponse.redirect(new URL("/schedule", request.url));
      } else {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    
    // Restrict drivers from accessing admin-only routes
    const adminOnlyPaths = [
      "/dashboard",
      "/staff",
      "/services",
      "/invoices",
      "/payments",
      "/integrations",
      "/settings",
    ];
    
    if (role === "DRIVER") {
      const isAdminPath = adminOnlyPaths.some((path) => pathname.startsWith(path));
      if (isAdminPath) {
        return NextResponse.redirect(new URL("/schedule", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/customers/:path*",
    "/jobs/:path*",
    "/invoices/:path*",
    "/payments/:path*",
    "/schedule/:path*",
    "/staff/:path*",
    "/services/:path*",
    "/settings/:path*",
    "/account/:path*",
    "/integrations/:path*",
    "/mobile/:path*",
  ],
};
