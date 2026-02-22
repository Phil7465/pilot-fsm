import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MobileAppearanceForm } from "@/components/mobile/mobile-appearance-form";
import Link from "next/link";

export default async function MobileSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/mobile/profile"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm active:bg-slate-50"
        >
          <svg
            className="h-5 w-5 text-slate-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Appearance</h1>
          <p className="text-xs text-slate-500">Navigation, font &amp; card colours</p>
        </div>
      </div>

      {/* Appearance Settings Only */}
      <MobileAppearanceForm />
    </div>
  );
}
