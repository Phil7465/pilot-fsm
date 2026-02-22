import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PhotoUpload } from "@/components/mobile/photo-upload";
import Link from "next/link";

export default async function JobDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      assignedStaff: true,
      lineItems: {
        include: {
          serviceTemplate: true,
        },
      },
    },
  });

  if (!job) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Job not found</h1>
          <Link
            href="/mobile/jobs"
            className="mt-4 inline-block text-brand-600 hover:text-brand-700"
          >
            ← Back to jobs
          </Link>
        </div>
      </div>
    );
  }

  const attachments = (job.attachments as any[]) || [];
  const photos = attachments.filter((a) => a.type === "photo");

  const STATUS_COLORS = {
    SCHEDULED: "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
  };

  const STATUS_LABELS = {
    SCHEDULED: "Scheduled",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="mx-auto max-w-2xl p-4">
        {/* Back Button */}
        <Link
          href={session.user.role === "DRIVER" ? "/schedule" : "/jobs"}
          className="mb-4 inline-flex items-center gap-2 text-brand-600 hover:text-brand-700"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to {session.user.role === "DRIVER" ? "schedule" : "jobs"}
        </Link>

        {/* Job Header */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {job.customer.name}
              </h1>
              <p className="text-sm text-slate-500">Job #{job.reference}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[job.status]}`}
            >
              {STATUS_LABELS[job.status]}
            </span>
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-4">
            <div className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-5 w-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <div>
                <p className="font-medium text-slate-900">{job.deliveryAddress}</p>
                <p className="text-sm text-slate-600">
                  {job.customer.city}, {job.customer.postcode}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <svg
                className="h-5 w-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-slate-900">
                {new Date(job.serviceDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            {job.assignedStaff && (
              <div className="flex items-center gap-3">
                <svg
                  className="h-5 w-5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <p className="text-slate-900">{job.assignedStaff.name}</p>
              </div>
            )}
          </div>

          {job.notes && (
            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">Notes</p>
              <p className="mt-1 text-slate-900">{job.notes}</p>
            </div>
          )}
        </div>

        {/* Line Items */}
        {job.lineItems.length > 0 && (
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Services
            </h2>
            <div className="space-y-3">
              {job.lineItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0 ${
                    session.user.role === "ADMIN" ? "justify-between" : ""
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      {item.description}
                    </p>
                    <p className="text-sm text-slate-600">
                      Qty: {item.quantity.toString()}
                    </p>
                  </div>
                  {session.user.role === "ADMIN" && (
                    <p className="font-semibold text-slate-900">
                      £{Number(item.unitPrice).toFixed(2)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photos Section */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Photos</h2>
          
          {photos.length > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-3">
              {photos.map((photo) => (
                <div key={photo.id} className="space-y-2">
                  <div className="overflow-hidden rounded-xl">
                    <img
                      src={photo.url}
                      alt={photo.caption || "Job photo"}
                      className="h-40 w-full object-cover"
                    />
                  </div>
                  {photo.caption && (
                    <p className="text-sm text-slate-600">{photo.caption}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    {photo.uploadedByName} •{" "}
                    {new Date(photo.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          <PhotoUpload jobId={job.id} />
        </div>

        {/* Customer Contact */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Customer Contact
          </h2>
          <div className="space-y-3">
            {job.customer.phone && (
              <a
                href={`tel:${job.customer.phone}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:bg-slate-50"
              >
                <svg
                  className="h-5 w-5 text-brand-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                <span className="font-medium text-slate-900">
                  {job.customer.phone}
                </span>
              </a>
            )}
            {job.customer.email && (
              <a
                href={`mailto:${job.customer.email}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:bg-slate-50"
              >
                <svg
                  className="h-5 w-5 text-brand-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span className="font-medium text-slate-900">
                  {job.customer.email}
                </span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
