import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";

const updateServiceSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional().nullable(),
  unitPrice: z.number().nonnegative("Unit price must be positive").optional(),
  vatCode: z.enum(["STANDARD", "REDUCED", "ZERO", "EXEMPT"]).optional(),
  incomeAccount: z.string().min(1, "Income account is required").optional(),
  isRecurring: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = updateServiceSchema.parse(body);

    const updateData: any = {
      ...(validatedData.name && { name: validatedData.name }),
      ...(validatedData.description !== undefined && { description: validatedData.description }),
      ...(validatedData.vatCode && { vatCode: validatedData.vatCode }),
      ...(validatedData.incomeAccount && { incomeAccount: validatedData.incomeAccount }),
      ...(validatedData.isRecurring !== undefined && { isRecurring: validatedData.isRecurring }),
    };

    if (validatedData.unitPrice !== undefined) {
      updateData.unitPrice = new Decimal(validatedData.unitPrice);
    }

    const service = await prisma.serviceTemplate.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(service);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Update service error:", error);
    return NextResponse.json(
      { error: "Failed to update service" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.serviceTemplate.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete service error:", error);
    return NextResponse.json(
      { error: "Failed to delete service" },
      { status: 500 }
    );
  }
}
