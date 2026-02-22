"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Job, Customer, User } from "@prisma/client";

type JobWithRelations = Job & {
  customer: Pick<Customer, "id" | "name" | "email">;
  assignedStaff: Pick<User, "id" | "name" | "email"> | null;
};

interface Props {
  jobs: JobWithRelations[];
  drivers: Pick<User, "id" | "name" | "email">[];
}

export function ScheduleCalendar({ jobs, drivers }: Props) {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [draggedJob, setDraggedJob] = useState<JobWithRelations | null>(null);

  function getMonthDates(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    const dates = [];
    const current = new Date(startDate);
    
    while (dates.length < 35) { // 5 weeks
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }

  function previousMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  }

  function thisMonth() {
    setCurrentMonth(new Date());
  }

  function formatMonthYear(date: Date) {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  function isCurrentMonth(date: Date) {
    return date.getMonth() === currentMonth.getMonth();
  }

  function isSameDay(date1: Date, date2: Date) {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  function getJobsForDateAndDriver(date: Date, driverId: string | null) {
    return jobs.filter((job) => {
      if (!job.serviceDate) return false;
      const jobDate = new Date(job.serviceDate);
      const sameDay = isSameDay(jobDate, date);
      const sameDriver = driverId === null ? !job.assignedStaff : job.assignedStaff?.id === driverId;
      return sameDay && sameDriver;
    });
  }

  function handleDragStart(job: JobWithRelations) {
    setDraggedJob(job);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  async function handleDrop(date: Date, driverId: string | null | undefined) {
    if (!draggedJob) return;

    const newDate = new Date(date);
    newDate.setHours(9, 0, 0, 0);

    // Use the provided driverId, or keep the existing assignment if not specified
    const assignedStaffId = driverId !== undefined ? driverId : draggedJob.assignedStaffId;

    try {
      const res = await fetch(`/api/jobs/${draggedJob.id}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceDate: newDate.toISOString(),
          assignedStaffId,
        }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to update job schedule");
      }
    } catch (err) {
      console.error("Failed to update schedule:", err);
      alert("An error occurred");
    } finally {
      setDraggedJob(null);
    }
  }

  const monthDates = getMonthDates(currentMonth);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const unassignedJobs = jobs.filter((job) => !job.assignedStaff);

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={previousMonth}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            ← Previous
          </button>
          <button
            onClick={thisMonth}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            This Month
          </button>
          <button
            onClick={nextMonth}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Next →
          </button>
        </div>
        <div className="text-lg font-semibold">
          {formatMonthYear(currentMonth)}
        </div>
      </div>

      {/* Unassigned Jobs Section */}
      {unassignedJobs.length > 0 && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <h3 className="mb-3 font-semibold text-yellow-900">
            Unassigned Jobs ({unassignedJobs.length})
          </h3>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {unassignedJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onDragStart={() => handleDragStart(job)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Monthly Calendar Grid */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-7">
          {/* Day headers */}
          {weekDays.map((day) => (
            <div
              key={day}
              className="border-b border-r border-slate-200 bg-slate-50 px-2 py-3 text-center text-sm font-semibold last:border-r-0"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {monthDates.map((date, idx) => {
            const dayJobs = jobs.filter((job) => isSameDay(job.serviceDate, date));
            const isToday = isSameDay(date, new Date());
            const isOtherMonth = !isCurrentMonth(date);

            return (
              <div
                key={idx}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(date, undefined)}
                className={`min-h-[120px] border-b border-r border-slate-200 p-2 last:border-r-0 ${
                  isToday ? "bg-blue-50" : isOtherMonth ? "bg-slate-50" : "bg-white"
                } hover:bg-slate-50`}
              >
                {/* Date number */}
                <div
                  className={`mb-2 text-right text-sm font-medium ${
                    isToday
                      ? "font-bold text-blue-600"
                      : isOtherMonth
                      ? "text-slate-400"
                      : "text-slate-700"
                  }`}
                >
                  {date.getDate()}
                </div>

                {/* Jobs for this day */}
                <div className="space-y-1">
                  {dayJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onDragStart={() => handleDragStart(job)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
        <strong>💡 Tip:</strong> Drag jobs between calendar days to reschedule. Assign drivers
        from the job details.
      </div>
    </div>
  );
}

function JobCard({
  job,
  onDragStart,
}: {
  job: JobWithRelations;
  onDragStart: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="cursor-move rounded-lg border border-slate-200 bg-white p-2 text-xs shadow-sm transition hover:shadow-md"
    >
      <div className="font-medium text-slate-900">{job.customer.name}</div>
      <div className="mt-1 text-slate-500">{job.reference}</div>
      <div className="mt-1 flex items-center gap-1">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            job.status === "SCHEDULED"
              ? "bg-blue-100 text-blue-700"
              : job.status === "IN_PROGRESS"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {job.status}
        </span>
      </div>
    </div>
  );
}
