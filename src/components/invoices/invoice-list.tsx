"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Invoice = {
  id: string;
  number: string;
  issueDate: string;
  dueDate: string;
  total: any;
  balanceDue: any;
  status: string;
  customer: { name: string };
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SENT: "bg-blue-100 text-blue-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
};

const nextActions: Record<string, { label: string; status: string }[]> = {
  DRAFT: [
    { label: "Mark as Sent", status: "SENT" },
  ],
  SENT: [
    { label: "Mark as Paid", status: "PAID" },
    { label: "Mark as Overdue", status: "OVERDUE" },
  ],
  PARTIAL: [
    { label: "Mark as Paid", status: "PAID" },
    { label: "Mark as Overdue", status: "OVERDUE" },
  ],
  OVERDUE: [
    { label: "Mark as Paid", status: "PAID" },
    { label: "Resend", status: "SENT" },
  ],
  PAID: [],
};

export function InvoiceList({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdating(null);
    router.refresh();
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-widest text-slate-500">
          <tr>
            <th className="px-4 py-3">Invoice</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Issue date</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Balance</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-t border-slate-100">
              <td className="px-4 py-3 font-medium text-slate-900">{invoice.number}</td>
              <td className="px-4 py-3">{invoice.customer.name}</td>
              <td className="px-4 py-3">{new Date(invoice.issueDate).toLocaleDateString()}</td>
              <td className="px-4 py-3">£{Number(invoice.total).toFixed(2)}</td>
              <td className="px-4 py-3">£{Number(invoice.balanceDue).toFixed(2)}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusColors[invoice.status] || "bg-slate-100 text-slate-600"}`}>
                  {invoice.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  {(nextActions[invoice.status] || []).map((action) => (
                    <button
                      key={action.status}
                      onClick={() => updateStatus(invoice.id, action.status)}
                      disabled={updating === invoice.id}
                      className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                    >
                      {updating === invoice.id ? "..." : action.label}
                    </button>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
