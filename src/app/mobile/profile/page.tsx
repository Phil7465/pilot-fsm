import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/mobile/sign-out-button";
import Link from "next/link";

export default async function MobileProfile() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // Get user stats
  const [completedJobs, totalJobs] = await Promise.all([
    prisma.job.count({
      where: {
        assignedStaffId: session.user.id,
        status: "COMPLETED",
      },
    }),
    prisma.job.count({
      where: {
        assignedStaffId: session.user.id,
      },
    }),
  ]);

  // Get recent activity (last 5 completed jobs)
  const recentJobs = await prisma.job.findMany({
    where: {
      assignedStaffId: session.user.id,
      status: "COMPLETED",
    },
    include: {
      customer: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 5,
  });

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold backdrop-blur-sm">
            {session.user.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{session.user.name}</h1>
            <p className="text-sm opacity-90">{session.user.email}</p>
            <p className="mt-1 text-xs font-medium uppercase opacity-75">
              {session.user.role}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{completedJobs}</p>
          <p className="text-sm text-slate-600">Jobs Completed</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{totalJobs}</p>
          <p className="text-sm text-slate-600">Total Jobs</p>
        </div>
      </div>

      {/* Recent Activity */}
      {recentJobs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent Activity
          </h2>
          <div className="space-y-2">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-xl bg-white p-3 shadow-sm"
              >
                <p className="font-medium text-slate-900">
                  {job.customer.name}
                </p>
                <p className="text-sm text-slate-600">
                  Completed{" "}
                  {new Date(job.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Quick Links</h2>
        
        <Link
          href="/mobile/settings"
          className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm transition-colors active:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
              <svg
                className="h-5 w-5 text-brand-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                />
              </svg>
            </div>
            <div>
              <span className="font-medium text-slate-900">Appearance</span>
              <p className="text-xs text-slate-500">Navigation, font &amp; card colours</p>
            </div>
          </div>
          <svg
            className="h-5 w-5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>

      {/* Sign Out */}
      <div className="pt-2">
        <SignOutButton />
      </div>
    </div>
  );
}
