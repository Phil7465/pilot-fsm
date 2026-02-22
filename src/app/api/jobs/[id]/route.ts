import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrThrow } from "@/lib/session";
import { ensureDriverOrAdmin } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

interface Params {
  params: { id: string };
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSessionOrThrow();
  ensureDriverOrAdmin(session.user.role as any);
  const body = await request.json();

  const job = await prisma.job.update({
    where: { id: params.id },
    data: {
      status: body.status,
      notes: body.notes,
      ...(body.attachments !== undefined && { attachments: body.attachments }),
    },
    include: { lineItems: true },
  });

  // Revalidate all mobile pages and job detail to sync changes across devices
  revalidatePath("/mobile");
  revalidatePath("/mobile/schedule");
  revalidatePath("/mobile/jobs");
  revalidatePath(`/jobs/${params.id}`);

  return NextResponse.json(job);
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await getSessionOrThrow();
  // Only admins can delete jobs
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Check if job has related records
  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      invoices: true,
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.invoices && job.invoices.length > 0) {
    return NextResponse.json({ 
      error: "Cannot delete job with existing invoices. Please delete the invoices first." 
    }, { status: 400 });
  }

  // Delete job and related line items (cascade)
  await prisma.job.delete({
    where: { id: params.id },
  });

  // Revalidate pages
  revalidatePath("/jobs");
  revalidatePath("/mobile/schedule");

  return NextResponse.json({ success: true });
}
