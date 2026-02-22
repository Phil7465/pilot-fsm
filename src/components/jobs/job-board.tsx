"use client";

import type { Job, Customer } from "@prisma/client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type JobWithCustomer = Job & { customer: Customer };

export function JobBoard({ jobs }: { jobs: JobWithCustomer[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const STATUS_COLORS = {
    SCHEDULED: "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-slate-100 text-slate-700",
  };

  async function handleDelete(jobId: string, customerName: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = confirm(`Delete job for "${customerName}"?`);
    if (!confirmed) return;

    setDeletingId(jobId);

    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete job");
        return;
      }

      router.refresh();
    } catch (error) {
      alert("Failed to delete job");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="card space-y-3">
      {jobs.map((job) => (
        <div key={job.id} className="relative group">
          <Link href={`/jobs/${job.id}`} className="block">
            <div className="rounded-2xl border border-slate-100 p-4 transition-all hover:bg-slate-50 hover:shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{job.customer.name}</p>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium uppercase ${STATUS_COLORS[job.status] || 'bg-slate-100 text-slate-600'}`}>
                    {job.status.replace("_", " ")}
                  </span>
                  <button
                    onClick={(e) => handleDelete(job.id, job.customer.name, e)}
                    disabled={deletingId === job.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg bg-red-500 p-2 text-white hover:bg-red-600 disabled:opacity-50"
                    title="Delete job"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            <p className="text-sm text-slate-500">{job.deliveryAddress}</p>
            <p className="text-sm text-slate-500">
              {new Date(job.serviceDate).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
              <p className="text-xs text-slate-400">Assigned to: {job.assignedStaffId ?? "Unassigned"}</p>
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}
