import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MobileJobCard } from "@/components/mobile/mobile-job-card";

export default async function MobileSchedule() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // Get upcoming jobs for the next 7 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  // Get jobs grouped by driver (or all jobs for admin)
  const jobs = await prisma.job.findMany({
    where: {
      serviceDate: {
        gte: today,
        lt: nextWeek,
      },
      ...(session.user.role === "DRIVER" 
        ? { assignedStaffId: session.user.id } 
        : {}
      ),
    },
    include: {
      customer: true,
      assignedStaff: true,
      lineItems: true,
    },
    orderBy: { serviceDate: "asc" },
  });

  // Group jobs by date
  const jobsByDate = jobs.reduce((acc, job) => {
    const dateKey = new Date(job.serviceDate).toDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(job);
    return acc;
  }, {} as Record<string, typeof jobs>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Schedule</h1>
        <p className="text-sm text-slate-500">Next 7 days</p>
      </div>

      {Object.keys(jobsByDate).length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-slate-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-2 text-slate-500">No jobs scheduled</p>
        </div>
      ) : (
        Object.entries(jobsByDate).map(([date, dayJobs]) => (
          <div key={date} className="space-y-3">
            <div className="sticky top-0 z-10 -mx-4 bg-slate-50 px-4 py-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {new Date(date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h2>
              <p className="text-xs text-slate-400">{dayJobs.length} jobs</p>
            </div>
            {dayJobs.map((job) => (
              <MobileJobCard key={job.id} job={job} />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
