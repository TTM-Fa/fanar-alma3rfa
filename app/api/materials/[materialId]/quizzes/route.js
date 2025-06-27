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
      select: { id: true },
    });

    if (!material) {
      return NextResponse.json(
        { success: false, error: "Material not found" },
        { status: 404 }
      );
    }

    // Fetch all quizzes for the material
    const quizzes = await prisma.quiz.findMany({
      where: { materialId: materialId },
      include: {
        _count: {
          select: { questions: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      quizzes: quizzes,
    });
  } catch (error) {
    console.error("Error fetching quizzes for material:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch quizzes" },
      { status: 500 }
    );
  }
}
