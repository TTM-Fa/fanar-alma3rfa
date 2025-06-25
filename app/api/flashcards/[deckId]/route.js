import { NextResponse } from "next/server";
import { prisma } from "@/utils/database";

export async function GET(request, { params }) {
  const { deckId } = await params;

  if (!deckId) {
    return NextResponse.json(
      { success: false, error: "Deck ID is required" },
      { status: 400 }
    );
  }

  try {
    // Fetch the flashcard deck with its flashcards
    const deck = await prisma.flashcardDeck.findUnique({
      where: { id: deckId },
      include: {
        flashcards: true,
        material: {
          select: {
            id: true,
            title: true,
            type: true,
            fileName: true,
          },
        },
      },
    });

    if (!deck) {
      return NextResponse.json(
        { success: false, error: "Flashcard deck not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deck: deck,
    });
  } catch (error) {
    console.error("Error fetching flashcard deck:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch flashcard deck" },
      { status: 500 }
    );
  }
}
