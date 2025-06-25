import { NextResponse } from "next/server";
import { prisma } from "@/utils/database";
import OpenAI from "openai";



// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { materialId, numFlashcards, title, description } =
      await request.json();

    // Validate input
    if (!materialId) {
      return NextResponse.json(
        { success: false, error: "Material ID is required" },
        { status: 400 }
      );
    }

    // Get the material with raw content
    const material = await prisma.material.findUnique({
      where: { id: materialId },
    });

    if (!material) {
      return NextResponse.json(
        { success: false, error: "Material not found" },
        { status: 404 }
      );
    }

    if (!material.rawContent) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Material does not have any content to generate flashcards from",
        },
        { status: 400 }
      );
    }

    // Set default parameters
    const flashcardParams = {
      numFlashcards: numFlashcards || 10,
      title: title || `Flashcards for ${material.title || "Study Material"}`,
      description:
        description ||
        `A set of flashcards generated from ${
          material.title || "study material"
        }`,
    };

    // Generate flashcards using OpenAI
    const flashcards = await generateFlashcards(
      material.rawContent,
      flashcardParams
    );

    // Create the flashcard deck in the database
    const deck = await prisma.flashcardDeck.create({
      data: {
        title: flashcardParams.title,
        description: flashcardParams.description,
        materialId: material.id,
        flashcards: {
          create: flashcards,
        },
      },
      include: {
        flashcards: true,
      },
    });

    return NextResponse.json({
      success: true,
      deck,
    });
  } catch (error) {
    console.error("Error generating flashcards:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate flashcards",
      },
      { status: 500 }
    );
  }
}

/**
 * Generate flashcards using OpenAI
 */
async function generateFlashcards(content, params) {
  // Truncate content if it's too long (OpenAI has token limits)
  const truncatedContent =
    content.length > 15000 ? content.substring(0, 15000) + "..." : content;

  const { numFlashcards } = params;

  // Create a prompt for OpenAI to generate flashcards
  const prompt = `
    Based on the following study material, create ${numFlashcards} flashcards that cover key concepts, definitions, examples, and important information.

    Study Material:
    ${truncatedContent}

    Requirements:
    1. Generate exactly ${numFlashcards} flashcards
    2. Each flashcard should have two parts: the front (question/term) and back (answer/definition)
    3. Make the flashcards concise but comprehensive
    4. Focus on the most important information in the material
    5. Include a variety of different types of information (definitions, concepts, examples, etc.)
    6. Provide clear, accurate information
    
    Return the result in the following JSON format:

    [
      {
        "front": "Term or question on the front of the card",
        "back": "Definition or answer on the back of the card"
      },
      // More flashcards...
    ]
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a professional educator creating high-quality flashcards based on study materials.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2500,
    });

    const responseText = response.choices[0].message.content.trim();

    // Extract the JSON part from the response
    let jsonStr = responseText;

    // If OpenAI wrapped the JSON in markdown code blocks, extract it
    if (responseText.includes("```json")) {
      jsonStr = responseText.split("```json")[1].split("```")[0].trim();
    } else if (responseText.includes("```")) {
      jsonStr = responseText.split("```")[1].split("```")[0].trim();
    }

    // Parse the JSON
    let flashcards = JSON.parse(jsonStr);

    return flashcards;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error(`Failed to generate flashcards: ${error.message}`);
  }
}
