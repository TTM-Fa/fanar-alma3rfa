import { NextResponse } from "next/server";
import { prisma } from "@/utils/database";
import { processFile } from "@/utils/fileProcessors";

export async function POST(request, { params }) {
  const { materialId } = await params;

  try {
    // Find the material to process
    const material = await prisma.material.findUnique({
      where: { id: materialId },
    });

    if (!material) {
      return NextResponse.json(
        { success: false, error: "Material not found" },
        { status: 404 }
      );
    }

    if (!material.link) {
      return NextResponse.json(
        { success: false, error: "No file linked to this material" },
        { status: 400 }
      );
    }

    // Update initial status to "pending"
    await prisma.material.update({
      where: { id: materialId },
      data: { status: "pending" },
    });

    // Process the file asynchronously
    // We don't await this to allow for long-running processes
    processFile(material.link, material.type, {
      materialId,
      prisma,
    }).catch((error) => {
      console.error(`Error processing material ${materialId}:`, error);
    });

    // Return success immediately, client will poll for status updates
    return NextResponse.json({
      success: true,
      message: "Processing started",
      materialId: material.id,
      status: "pending",
    });
  } catch (error) {
    console.error("Error initiating material processing:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
