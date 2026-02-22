import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InvoiceList } from "@/components/invoices/invoice-list";
import { InvoiceBuilder } from "@/components/invoices/invoice-builder";
import { serializeJson } from "@/lib/serializers";

export default async function InvoicesPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/api/auth/signin");
  }
  
  const [invoices, customers, jobs, settings, services] = await Promise.all([
    prisma.invoice.findMany({ include: { customer: true }, orderBy: { issueDate: "desc" } }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.job.findMany({ select: { id: true, reference: true }, orderBy: { serviceDate: "desc" } }),
    prisma.globalSetting.findFirst(),
    prisma.serviceTemplate.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-slate-500">Billing</p>
        <h1 className="text-3xl font-semibold text-slate-900">Invoices</h1>
      </div>
      <div className="space-y-8">
        <InvoiceBuilder customers={customers} jobs={jobs} services={services} isVatRegistered={settings?.isVatRegistered ?? true} />
        <InvoiceList invoices={serializeJson(invoices) as any} />
      </div>
    </div>
  );
}
