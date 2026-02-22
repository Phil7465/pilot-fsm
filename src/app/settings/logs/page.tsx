import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ErrorLogsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const logs = await prisma.errorLog.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Error Logs</h1>
        <p className="mt-1 text-sm text-slate-500">
          View errors and issues from mobile devices (last 100)
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-slate-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-2 text-slate-500">No errors logged</p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-200 bg-red-50 px-4 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                        {log.level.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-slate-900">
                        {log.user.name}
                      </span>
                      <span className="text-xs text-slate-500">
                        ({log.user.role})
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <p className="font-mono text-sm text-red-700">{log.message}</p>
                {log.url && (
                  <p className="mt-2 text-xs text-slate-500">
                    <span className="font-semibold">URL:</span> {log.url}
                  </p>
                )}
                {log.stack && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-semibold text-slate-700">
                      Stack Trace
                    </summary>
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-green-400">
                      {log.stack}
                    </pre>
                  </details>
                )}
                {log.userAgent && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-semibold text-slate-700">
                      User Agent
                    </summary>
                    <p className="mt-1 font-mono text-xs text-slate-600">
                      {log.userAgent}
                    </p>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
