import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <Image
        src="/icons/pilot_logo512.png"
        alt="Pilot Field Service Pro"
        width={120}
        height={120}
        priority
      />
      <p className="rounded-full bg-white/60 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-brand-600">
        Field Service Management OS
      </p>
      <h1 className="max-w-2xl text-4xl font-bold text-slate-900 sm:text-5xl">
        Pilot Field Service Pro keeps your crews in sync across office and field.
      </h1>
      <p className="max-w-2xl text-lg text-slate-600">
        Customer CRM, scheduling, invoicing, payments, and QuickBooks Online sync in one installable, offline-ready PWA built for real businesses.
      </p>
      <Link
        href="/auth/signin"
        className="btn-primary"
      >
        Sign in
      </Link>
    </main>
  );
}
