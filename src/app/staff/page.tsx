import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StaffList } from "@/components/staff/staff-list";
import { AddStaffButton } from "@/components/staff/add-staff-button";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const staff = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          jobsAssigned: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Staff Members</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your team and assign members to jobshttp://192.168.0.226:3000
          </p>
        </div>
        <AddStaffButton />
      </div>

      <StaffList staff={staff} />
    </div>
  );
}
