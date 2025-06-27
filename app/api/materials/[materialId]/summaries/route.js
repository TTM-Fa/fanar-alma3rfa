import { NextResponse } from "next/server";
import { prisma } from "@/utils/database";

export async function GET(request, { params }) {
  const { materialId } = await params;

  if (!materialId) {
    return NextResponse.json(
      { success: false, error: "Material ID is required" },
      { status: 400 }
    );
  }

  try {
    // Check if the material exists
    const material = await prisma.material.findUnique({
      where: { id: materialId },
    });

    if (!material) {
      return NextResponse.json(
        { success: false, error: "Material not found" },
        { status: 404 }
      );
    }

    // Fetch all summaries for the material
    const summaries = await prisma.summary.findMany({
      where: { materialId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      summaries,
    });
  } catch (error) {
    console.error("Error fetching summaries:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch summaries" },
      { status: 500 }
    );
  }
}
