"use client";

import { useState } from "react";
import type { Customer } from "@prisma/client";
import { CustomerList } from "./customer-list";
import { CustomerForm } from "./customer-form";

interface CustomerPageClientProps {
  customers: Customer[];
  userRole: "ADMIN" | "DRIVER";
  isAdmin: boolean;
}

export function CustomerPageClient({ customers, userRole, isAdmin }: CustomerPageClientProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const handleCancel = () => {
    setSelectedCustomer(undefined);
  };

  if (!isAdmin) {
    return <CustomerList customers={customers} userRole={userRole} />;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
      <CustomerList 
        customers={customers} 
        userRole={userRole}
        onSelectCustomer={handleSelectCustomer}
      />
      <CustomerForm 
        customer={selectedCustomer}
        onCancel={selectedCustomer ? handleCancel : undefined}
      />
    </div>
  );
}
