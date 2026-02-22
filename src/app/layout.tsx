import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { inter } from "./theme";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SidebarLogo } from "@/components/SidebarLogo";
import { ThemeInitializer } from "@/components/ThemeInitializer";
import { UserMenu } from "@/components/UserMenu";
import { SignOutButton } from "@/components/SignOutButton";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Pilot Field Service Pro",
  description: "Jobber-style field service management platform for small teams.",
  manifest: "/manifest.webmanifest",
  icons: [{ rel: "icon", url: "/icons/icon.svg" }],
};

export async function generateViewport(): Promise<Viewport> {
  const settings = await prisma.globalSetting.findFirst();
  return {
    themeColor: (settings && (settings as any).primaryColor) || "#1b76e5",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  };
}

export const dynamic = "force-dynamic";

const allNavLinks = [
  { href: "/dashboard", label: "Dashboard", roles: ["ADMIN"] },
  { href: "/schedule", label: "Schedule", roles: ["ADMIN", "DRIVER"] },
  { href: "/customers", label: "Customers", roles: ["ADMIN", "DRIVER"] },
  { href: "/staff", label: "Staff", roles: ["ADMIN"] },
  { href: "/services", label: "Services", roles: ["ADMIN"] },
  { href: "/jobs", label: "Jobs", roles: ["ADMIN", "DRIVER"] },
  { href: "/invoices", label: "Invoices", roles: ["ADMIN"] },
  { href: "/payments", label: "Payments", roles: ["ADMIN"] },
  { href: "/integrations/quickbooks", label: "QuickBooks", roles: ["ADMIN"] },
  { href: "/integrations/payment-gateways", label: "Payment Gateways", roles: ["ADMIN"] },
  { href: "/account", label: "Account", roles: ["ADMIN", "DRIVER"] },
  { href: "/settings", label: "Settings", roles: ["ADMIN"] },
];

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const globalSettings = await prisma.globalSetting.findFirst();
  const companyName = globalSettings?.companyName || "Pilot Field Service Pro";
  const companyNameSize = globalSettings?.companyNameSize || "text-xl";
  const companyNameWeight = globalSettings?.companyNameWeight || "font-semibold";

  const isAuthenticated = !!session?.user;
  const userRole = session?.user?.role || "DRIVER";
  
  // Filter nav links based on user role
  const navLinks = allNavLinks.filter(link => link.roles.includes(userRole));

  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className={isAuthenticated ? "bg-slate-50" : "bg-white"} style={{ backgroundColor: isAuthenticated ? 'var(--color-background, #f8fafc)' : '#ffffff' }}>
        <Providers>
          <ThemeInitializer />
          <div className={`min-h-screen ${isAuthenticated ? 'px-4 py-6 sm:px-6 lg:px-8' : ''}`} style={{ backgroundColor: isAuthenticated ? 'var(--color-background, #f8fafc)' : '#ffffff' }}>
            {isAuthenticated ? (
              <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
                <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6 lg:h-fit lg:w-64 lg:flex-shrink-0 xl:w-72" style={{ backgroundColor: 'var(--color-sidebar, #ffffff)', color: 'var(--color-sidebar-font, #475569)' }}>
                  <SidebarLogo companyName={companyName} companyNameSize={companyNameSize} companyNameWeight={companyNameWeight} />
                  <p className="mt-3 text-center text-sm" style={{ color: 'var(--color-sidebar-font, #64748b)' }}>Field service operating system</p>
                  <div className="my-6 border-t" style={{ borderColor: 'var(--color-sidebar-font, #e2e8f0)' }}></div>
                  <nav className="space-y-2 text-sm font-medium" style={{ color: 'var(--color-sidebar-font, #475569)' }}>
                    {navLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center justify-between rounded-xl px-3 py-2 transition hover:text-[var(--color-sidebar,#ffffff)] hover:bg-[var(--color-sidebar-font,#475569)]"
                      >
                        <span>{item.label}</span>
                        <span className="text-xs opacity-60">→</span>
                      </Link>
                    ))}
                    <SignOutButton />
                  </nav>
                  <div className="my-6 border-t" style={{ borderColor: 'var(--color-sidebar-font, #e2e8f0)' }}></div>
                  <UserMenu user={session.user} />
                </aside>
                <div className="flex min-h-screen flex-1 flex-col gap-6">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm lg:hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Link href="/" className="text-lg font-semibold text-slate-900">
                        {companyName}
                      </Link>
                    </div>
                  </div>
                  <main className="flex-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" style={{ backgroundColor: 'var(--color-card, #ffffff)' }}>
                    {children}
                  </main>
                  <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
                    &copy; {new Date().getFullYear()} {companyName}
                  </footer>
                </div>
              </div>
            ) : (
              <>
                {children}
              </>
            )}
          </div>
        </Providers>
      </body>
    </html>
  );
}
