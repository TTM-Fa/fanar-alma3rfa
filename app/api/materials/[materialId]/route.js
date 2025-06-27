import { NextResponse } from "next/server";
import { prisma } from "@/utils/database";

export async function GET(request, { params }) {
  const { materialId } = await params;

  try {
    const material = await prisma.material.findUnique({
      where: {
        id: materialId,
      },
    });

    if (!material) {
      return NextResponse.json(
        { success: false, error: "Material not found" },
        { status: 404 }
      );
    }

    // Get the actual processing status from the database
    const status = material.status || "pending";

    return NextResponse.json({
      success: true,
      material_id: material.id,
      material_status: status,
      title: material.title,
      fileName: material.fileName,
      type: material.type,
      link: material.link,
      rawContent: material.rawContent, // Include the extracted text
      topics: material.topics || [], // Include the topics array
      createdAt: material.createdAt,
      updatedAt: material.updatedAt,
      studySessionId: material.studySessionId, // Include the session ID
    });
  } catch (error) {
    console.error("Error fetching material status:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}