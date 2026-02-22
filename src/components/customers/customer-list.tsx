"use client";

import type { Customer } from "@prisma/client";

interface CustomerListProps {
  customers: Customer[];
  userRole?: "ADMIN" | "DRIVER";
  onSelectCustomer?: (customer: Customer) => void;
}

export function CustomerList({ customers, userRole = "ADMIN", onSelectCustomer }: CustomerListProps) {
  const isDriver = userRole === "DRIVER";

  if (isDriver) {
    // Driver view: Card-based layout with Call/Email buttons
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {customers.map((customer) => (
          <div key={customer.id} className="card space-y-3">
            <div>
              <h3 className="font-semibold text-slate-900">{customer.name}</h3>
              {customer.company && (
                <p className="text-sm text-slate-500">{customer.company}</p>
              )}
            </div>
            <div className="space-y-1 text-sm text-slate-600">
              {customer.email && (
                <p className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {customer.email}
                </p>
              )}
              {customer.phone && (
                <p className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {customer.phone}
                </p>
              )}
              <p className="text-xs text-slate-500">
                {customer.addressLine}, {customer.city} {customer.postcode}
              </p>
            </div>
            <div className="flex gap-2 border-t border-slate-100 pt-3">
              {customer.phone && (
                <a
                  href={`tel:${customer.phone}`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call
                </a>
              )}
              {customer.email && (
                <a
                  href={`mailto:${customer.email}`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Admin view: Table layout
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-widest text-slate-500">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3">VAT</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr 
              key={customer.id} 
              onClick={() => onSelectCustomer?.(customer)}
              className="border-t border-slate-100 text-slate-700 cursor-pointer hover:bg-slate-50 transition"
            >
              <td className="px-4 py-3 font-medium">{customer.name}</td>
              <td className="px-4 py-3">{customer.company ?? "—"}</td>
              <td className="px-4 py-3">
                <p>{customer.email}</p>
                <p className="text-xs text-slate-500">{customer.phone}</p>
              </td>
              <td className="px-4 py-3">{customer.vatStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
