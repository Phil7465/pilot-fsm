import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MobileJobCard } from "@/components/mobile/mobile-job-card";

export default async function MobileDashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get jobs for today, prioritizing assigned to this user
  const [myJobs, otherJobs] = await Promise.all([
    prisma.job.findMany({
      where: {
        serviceDate: {
          gte: today,
          lt: tomorrow,
        },
        assignedStaffId: session.user.id,
      },
      include: {
        customer: true,
        assignedStaff: true,
        lineItems: true,
      },
      orderBy: { serviceDate: "asc" },
    }),
    session.user.role === "ADMIN"
      ? prisma.job.findMany({
          where: {
            serviceDate: {
              gte: today,
              lt: tomorrow,
            },
            assignedStaffId: {
              not: session.user.id,
            },
          },
          include: {
            customer: true,
            assignedStaff: true,
            lineItems: true,
          },
          orderBy: { serviceDate: "asc" },
        })
      : [],
  ]);

  const totalJobs = myJobs.length + otherJobs.length;
  const completedJobs = [...myJobs, ...otherJobs].filter(
    (job) => job.status === "COMPLETED"
  ).length;

  return (
    <div className="space-y-4">
      {/* Today's Stats */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 p-6 text-white shadow-lg">
        <p className="text-sm font-medium opacity-90">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h1 className="mt-1 text-3xl font-bold">Today&apos;s Jobs</h1>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
            <p className="text-2xl font-bold">{myJobs.length}</p>
            <p className="text-xs font-medium opacity-90">Assigned to me</p>
          </div>
          <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
            <p className="text-2xl font-bold">
              {completedJobs}/{totalJobs}
            </p>
            <p className="text-xs font-medium opacity-90">Completed</p>
          </div>
        </div>
      </div>

      {/* My Jobs */}
      {myJobs.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">My Jobs</h2>
          {myJobs.map((job) => (
            <MobileJobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-500">No jobs assigned to you today</p>
        </div>
      )}

      {/* Other Jobs (Admin only) */}
      {session.user.role === "ADMIN" && otherJobs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Other Jobs</h2>
          {otherJobs.map((job) => (
            <MobileJobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
