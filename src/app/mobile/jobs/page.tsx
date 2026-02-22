import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function MobileJobsPage() {
  const jobs = await prisma.job.findMany({ 
    include: { 
      customer: true,
      lineItems: {
        include: {
          serviceTemplate: true,
        },
      },
    }, 
    orderBy: { serviceDate: "asc" }, 
    take: 20 
  });
  
  const STATUS_COLORS = {
    SCHEDULED: "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-slate-100 text-slate-700",
  };
  
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-slate-500">Driver view</p>
        <h1 className="text-2xl font-semibold">Today&apos;s schedule</h1>
      </div>
      <div className="space-y-4">
        {jobs.map((job) => (
          <Link 
            key={job.id} 
            href={`/jobs/${job.id}`}
            className="block"
          >
            <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.99]" style={{ backgroundColor: 'var(--color-card, #ffffff)' }}>
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold">{job.customer.name}</p>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium uppercase ${STATUS_COLORS[job.status] || 'bg-slate-100 text-slate-700'}`}>
                  {job.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-slate-600">
                {new Date(job.serviceDate).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="text-sm text-slate-500">{job.deliveryAddress}</p>
              {job.notes && <p className="mt-2 text-sm text-slate-600">Notes: {job.notes}</p>}
              
              {/* Show service count */}
              {job.lineItems.length > 0 && (
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  {job.lineItems.length} service{job.lineItems.length !== 1 ? 's' : ''}
                </div>
              )}
              
              <div className="mt-3 flex items-center justify-end gap-2 text-sm text-brand-600">
                <span>View details</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}
