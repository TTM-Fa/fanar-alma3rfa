import { NextResponse } from "next/server";
import { prisma } from "@/utils/database";

// This endpoint retrieves a specific flashcard deck by its ID
// and includes its associated flashcards and material information.

export async function GET(request, { params }) {
  try {
    const { deckId } = await params;
    console.log(`🔍 Received request for deck ID: ${deckId}`);

    if (!deckId) {
      console.log("❌ No deck ID provided");
      return NextResponse.json(
        { success: false, error: "Deck ID is required" },
        { status: 400 }
      );
    }

    // Validate deckId format (should be a CUID)
    if (typeof deckId !== 'string' || deckId.length < 10) {
      console.log(`❌ Invalid deck ID format: ${deckId}`);
      return NextResponse.json(
        { success: false, error: "Invalid deck ID format" },
        { status: 400 }
      );
    }

    console.log(`🔍 Fetching flashcard deck with ID: ${deckId}`);
    
    // First, verify the deck exists with a simple query
    const deckExists = await prisma.flashcardDeck.findUnique({
      where: { id: deckId },
      select: { id: true, title: true }
    });

    if (!deckExists) {
      console.log(`❌ Deck not found: ${deckId}`);
      return NextResponse.json(
        { success: false, error: "Flashcard deck not found" },
        { status: 404 }
      );
    }

    console.log(`✅ Deck found: ${deckExists.title}, fetching full data...`);

    // Fetch the flashcard deck with its flashcards
    const deck = await prisma.flashcardDeck.findUnique({
      where: { id: deckId },
      include: {        flashcards: {
          select: {
            id: true,
            front: true,
            back: true,
            imageUrl: true,
            createdAt: true,
            updatedAt: true
          }
        },
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

    console.log(`✅ Successfully fetched deck with ${deck?.flashcards?.length || 0} flashcards`);

    return NextResponse.json({
      success: true,
      deck: deck,
    });

  } catch (error) {
    console.error("❌ Error fetching flashcard deck:", error);
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      meta: error.meta,
      deckId: params?.deckId || 'unknown'
    });

    // Handle specific Prisma errors
    let errorMessage = "Failed to fetch flashcard deck";
    let statusCode = 500;

    if (error.code === 'P5000') {
      errorMessage = "Database connection error. Please try again.";
      console.error("🔴 P5000 Database error - check database connection");
    } else if (error.code === 'P2025') {
      errorMessage = "Flashcard deck not found";
      statusCode = 404;
    } else if (error.code?.startsWith('P')) {
      errorMessage = "Database query error. Please check the request.";
      console.error(`🔴 Prisma error ${error.code}: ${error.message}`);
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          code: error.code,
          message: error.message,
          deckId: params?.deckId || 'unknown'
        } : undefined
      },
      { status: statusCode }
    );
  }
}
