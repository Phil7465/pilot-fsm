"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Job, Customer, User, JobLineItem } from "@prisma/client";

type JobWithRelations = Job & {
  customer: Customer;
  assignedStaff: User | null;
  lineItems: JobLineItem[];
};

interface MobileJobCardProps {
  job: JobWithRelations;
}

const STATUS_COLORS = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-700",
};

const STATUS_LABELS = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function MobileJobCard({ job }: MobileJobCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const handleStatusUpdate = async (newStatus: Job["status"]) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to update job status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getNextStatus = () => {
    if (job.status === "SCHEDULED") return "IN_PROGRESS";
    if (job.status === "IN_PROGRESS") return "COMPLETED";
    return null;
  };

  const nextStatus = getNextStatus();

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ backgroundColor: 'var(--color-card, #ffffff)' }}>
      <Link href={`/jobs/${job.id}`} className="block p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">
              {job.customer.name}
            </h3>
            <p className="mt-0.5 text-sm text-slate-600">
              {job.deliveryAddress}
            </p>
            <p className="text-sm text-slate-600">
              {job.customer.city}, {job.customer.postcode}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[job.status]}`}
          >
            {STATUS_LABELS[job.status]}
          </span>
        </div>

        {job.notes && (
          <p className="mt-2 text-sm text-slate-700">{job.notes}</p>
        )}

        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            {job.lineItems.length > 0 && (
              <div className="flex items-center gap-1.5 text-slate-600">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <span>{job.lineItems.length} items</span>
              </div>
            )}
          </div>
          {job.assignedStaff && (
            <span className="text-xs text-slate-500">
              {job.assignedStaff.name}
            </span>
          )}
        </div>
      </Link>

      {/* Quick Actions */}
      {nextStatus && (
        <div className="border-t border-slate-100 px-4 py-3">
          <button
            onClick={() => handleStatusUpdate(nextStatus)}
            disabled={isUpdating}
            className="w-full rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
          >
            {isUpdating ? (
              "Updating..."
            ) : (
              <>
                {nextStatus === "IN_PROGRESS" && "Start Job"}
                {nextStatus === "COMPLETED" && "Complete Job"}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
