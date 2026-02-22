import type { Metadata, Viewport } from "next";
import { inter } from "../theme";
import "../globals.css";
import { Providers } from "@/components/providers";
import { ThemeInitializer } from "@/components/ThemeInitializer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MobileNav } from "@/components/mobile/mobile-nav";
import { ErrorLogger } from "@/components/mobile/error-logger";
import { LandscapePrompt } from "@/components/mobile/landscape-prompt";

export const metadata: Metadata = {
  title: "Pilot FSM - Driver",
  description: "Driver view for field service management",
  manifest: "/manifest.webmanifest",
  icons: [{ rel: "icon", url: "/icons/icon.svg" }],
};

export const viewport: Viewport = {
  themeColor: "#1b76e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const dynamic = "force-dynamic";

export default async function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  return (
    <html lang="en" className={inter.className}>
      <body className="bg-slate-50" style={{ backgroundColor: 'var(--color-background, #f8fafc)' }}>
        <Providers>
          <ThemeInitializer />
          <LandscapePrompt />
          <ErrorLogger />
          <div className="flex min-h-screen flex-col pb-16">
            {/* Mobile Header */}
            <header className="sticky top-0 z-40 bg-white shadow-sm" style={{ backgroundColor: 'var(--color-sidebar, #ffffff)' }}>
              <div className="h-1 bg-gradient-to-r from-brand-500 to-brand-600"></div>
              <div className="flex h-14 items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 shadow-sm">
                    <span className="text-sm font-bold text-white">P</span>
                  </div>
                  <div>
                    <span className="text-base font-bold text-slate-900" style={{ color: 'var(--color-sidebar-font, #1e293b)' }}>Pilot FSM</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800" style={{ color: 'var(--color-sidebar-font, #334155)' }}>{session.user.name}</p>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400" style={{ color: 'var(--color-sidebar-font, #94a3b8)', opacity: 0.6 }}>{session.user.role?.toLowerCase()}</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-600">
                    {session.user.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4" style={{ backgroundColor: 'var(--color-background, #f8fafc)' }}>
              {children}
            </main>

            {/* Bottom Navigation */}
            <MobileNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}
