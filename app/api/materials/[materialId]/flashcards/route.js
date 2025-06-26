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

    // Fetch all flashcard decks for the material
    const decks = await prisma.flashcardDeck.findMany({
      where: { materialId: materialId },
      include: {
        _count: {
          select: { flashcards: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      decks: decks,
    });
  } catch (error) {
    console.error("Error fetching flashcard decks for material:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch flashcard decks" },
      { status: 500 }
    );
  }
}
