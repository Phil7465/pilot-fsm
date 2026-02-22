import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const scheduleSchema = z.object({
  serviceDate: z.string().datetime(),
  assignedStaffId: z.string().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = scheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error },
        { status: 400 }
      );
    }

    const { serviceDate, assignedStaffId } = parsed.data;

    // If assigning to a driver, verify they exist
    if (assignedStaffId) {
      const driver = await prisma.user.findUnique({
        where: { id: assignedStaffId, role: "DRIVER" },
      });

      if (!driver) {
        return NextResponse.json(
          { error: "Driver not found" },
          { status: 404 }
        );
      }
    }

    const job = await prisma.job.update({
      where: { id: params.id },
      data: {
        serviceDate: new Date(serviceDate),
        assignedStaffId: assignedStaffId,
      },
      include: {
        customer: true,
        assignedStaff: true,
      },
    });

    return NextResponse.json(job);
  } catch (error) {
    console.error("Failed to update job schedule:", error);
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 }
    );
  }
}
