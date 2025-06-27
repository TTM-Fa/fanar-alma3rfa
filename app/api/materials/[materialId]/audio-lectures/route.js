import { NextResponse } from "next/server";
import { prisma } from "@/utils/database";

export async function GET(request, { params }) {
  try {
    const { materialId } = await params;

    if (!materialId) {
      return NextResponse.json(
        { success: false, error: "Material ID is required" },
        { status: 400 }
      );
    }

    // Check if the material exists
    const material = await prisma.material.findUnique({
      where: { id: materialId },
      select: { id: true },
    });

    if (!material) {
      return NextResponse.json(
        { success: false, error: "Material not found" },
        { status: 404 }
      );
    }

    // Get all audio lectures for this material
    // Only select the fields we need and explicitly exclude the audioUrl which might be large
    const audioLectures = await prisma.audioLecture.findMany({
      where: { materialId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        duration: true,
        createdAt: true,
        updatedAt: true,
        // Exclude the audioUrl as it may contain large base64 data
      },
    });

    return NextResponse.json({
      success: true,
      audioLectures,
    });
  } catch (error) {
    console.error("Error fetching audio lectures:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch audio lectures",
      },
      { status: 500 }
    );
  }
}
