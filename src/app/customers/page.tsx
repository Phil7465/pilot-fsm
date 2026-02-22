import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CustomerPageClient } from "@/components/customers/customer-page-client";
import { Search } from "./search";
import { Prisma } from "@prisma/client";

export default async function CustomersPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/api/auth/signin");
  }
  
  const isAdmin = session.user.role === "ADMIN";
  
  const search = typeof searchParams.search === 'string' ? searchParams.search : undefined;
  const where: Prisma.CustomerWhereInput = search ? {
    OR: [
      { name: { contains: search, mode: "insensitive" as const } },
      { company: { contains: search, mode: "insensitive" as const } },
      { email: { contains: search, mode: "insensitive" as const } },
      { phone: { contains: search, mode: "insensitive" as const } },
    ]
  } : {};

  const customers = await prisma.customer.findMany({ 
    where,
    orderBy: { createdAt: "desc" } 
  });
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-slate-500">CRM</p>
          <h1 className="text-3xl font-semibold text-slate-900">Customers</h1>
        </div>
        <div className="w-72">
          <Search placeholder="Search customers..." />
        </div>
      </div>
      <CustomerPageClient 
        customers={customers} 
        userRole={session.user.role} 
        isAdmin={isAdmin}
      />
    </div>
  );
}
