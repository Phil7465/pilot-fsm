import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

async function getStats() {
  const [jobsScheduled, invoicesDue, revenue, outstanding] = await Promise.all([
    prisma.job.count({ where: { status: "SCHEDULED" } }),
    prisma.invoice.count({ where: { balanceDue: { gt: 0 } } }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.invoice.aggregate({ _sum: { balanceDue: true } }),
  ]);

  return {
    jobsScheduled,
    invoicesDue,
    revenue: Number(revenue._sum.amount ?? 0).toFixed(2),
    outstanding: Number(outstanding._sum.balanceDue ?? 0).toFixed(2),
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/api/auth/signin");
  }
  const stats = await getStats();
  const jobs = await prisma.job.findMany({ include: { customer: true }, orderBy: { serviceDate: "asc" }, take: 5 });
  const invoices = await prisma.invoice.findMany({ include: { customer: true }, orderBy: { issueDate: "desc" }, take: 5 });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Welcome back, {session.user.name}</p>
          <h1 className="text-3xl font-semibold text-slate-900">Operations overview</h1>
        </div>
        <Link href="/jobs" className="btn-primary">
          Schedule job
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        {[{ label: "Jobs scheduled", value: stats.jobsScheduled }, { label: "Invoices due", value: stats.invoicesDue }, { label: "Revenue", value: `£${stats.revenue}` }, { label: "Outstanding", value: `£${stats.outstanding}` }].map((card) => (
          <div key={card.label} className="card">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Upcoming jobs</h2>
            <Link href="/jobs" className="text-sm text-brand-600">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="rounded-xl border border-slate-100 p-4">
                <p className="text-sm font-medium text-slate-900">{job.customer.name}</p>
                <p className="text-sm text-slate-500">
                  {new Date(job.serviceDate).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="text-xs uppercase tracking-wide text-slate-500">{job.status.replace("_", " ")}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent invoices</h2>
            <Link href="/invoices" className="text-sm text-brand-600">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-xl border border-slate-100 p-4">
                <p className="text-sm font-medium text-slate-900">{invoice.number}</p>
                <p className="text-sm text-slate-500">{invoice.customer.name}</p>
                <p className="text-xs uppercase tracking-wide text-slate-500">{invoice.status}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
