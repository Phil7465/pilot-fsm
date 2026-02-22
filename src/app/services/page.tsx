import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ServiceList } from "@/components/services/service-list";
import { AddServiceButton } from "@/components/services/add-service-button";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const services = await prisma.serviceTemplate.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Services</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create service templates to quickly add line items to jobs
          </p>
        </div>
        <AddServiceButton />
      </div>

      <ServiceList services={services} />
    </div>
  );
}
