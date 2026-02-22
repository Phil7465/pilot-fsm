import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";

const createServiceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  unitPrice: z.number().nonnegative("Unit price must be positive"),
  vatCode: z.enum(["STANDARD", "REDUCED", "ZERO", "EXEMPT"]),
  incomeAccount: z.string().min(1, "Income account is required"),
  isRecurring: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = createServiceSchema.parse(body);

    const service = await prisma.serviceTemplate.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        unitPrice: new Decimal(validatedData.unitPrice),
        vatCode: validatedData.vatCode,
        incomeAccount: validatedData.incomeAccount,
        isRecurring: validatedData.isRecurring,
      },
    });

    return NextResponse.json(service);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Create service error:", error);
    return NextResponse.json(
      { error: "Failed to create service" },
      { status: 500 }
    );
  }
}
