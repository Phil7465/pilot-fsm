import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { JobForm } from "@/components/jobs/job-form";
import { JobBoard } from "@/components/jobs/job-board";

export default async function JobsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/api/auth/signin");
  }
  
  const isAdmin = session.user.role === "ADMIN";
  
  const [jobs, customers, staff, services] = await Promise.all([
    prisma.job.findMany({ include: { customer: true }, orderBy: { serviceDate: "asc" } }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: "DRIVER" }, select: { id: true, name: true } }),
    prisma.serviceTemplate.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-slate-500">Scheduling</p>
        <h1 className="text-3xl font-semibold text-slate-900">Jobs & Work Orders</h1>
      </div>
      {isAdmin ? (
        <div className="grid gap-8 lg:grid-cols-[1fr,2fr]">
          <JobBoard jobs={jobs} />
          <JobForm customers={customers} staff={staff} services={services} />
        </div>
      ) : (
        <JobBoard jobs={jobs} />
      )}
    </div>
  );
}
