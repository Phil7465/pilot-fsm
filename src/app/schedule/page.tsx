import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ScheduleCalendar } from "@/components/schedule/schedule-calendar";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const [jobs, drivers] = await Promise.all([
    prisma.job.findMany({
      where: {
        status: {
          in: ["SCHEDULED", "IN_PROGRESS"],
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedStaff: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        serviceDate: "asc",
      },
    }),
    prisma.user.findMany({
      where: {
        role: "DRIVER",
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="mt-1 text-sm text-slate-500">
            Drag and drop jobs to assign drivers and update schedules.
          </p>
        </div>
      </div>

      <ScheduleCalendar jobs={jobs} drivers={drivers} />
    </div>
  );
}
