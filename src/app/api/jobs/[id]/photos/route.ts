import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const job = await prisma.job.findUnique({
      where: { id: params.id },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("photo") as File;
    const caption = formData.get("caption") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads", "jobs", params.id);
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filepath = join(uploadsDir, filename);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Update job attachments
    const currentAttachments = (job.attachments as any[]) || [];
    const newAttachment = {
      id: `photo-${timestamp}`,
      type: "photo",
      filename,
      url: `/uploads/jobs/${params.id}/${filename}`,
      caption: caption || "",
      uploadedBy: session.user.id,
      uploadedByName: session.user.name,
      uploadedAt: new Date().toISOString(),
    };

    const updatedAttachments = [...currentAttachments, newAttachment];

    await prisma.job.update({
      where: { id: params.id },
      data: {
        attachments: updatedAttachments,
      },
    });

    // Revalidate pages
    revalidatePath("/mobile");
    revalidatePath("/mobile/schedule");
    revalidatePath("/mobile/jobs");
    revalidatePath(`/jobs/${params.id}`);

    return NextResponse.json({ 
      success: true, 
      attachment: newAttachment 
    });
  } catch (error) {
    console.error("Error uploading photo:", error);
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}
