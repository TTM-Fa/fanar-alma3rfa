import { NextResponse } from "next/server";
import { prisma } from "@/utils/database";
import FlashcardGenerator from "@/utils/FlashcardGenerator";
import ImageGenerator from "@/utils/ImageGenerator";
import { filterContentByTopics } from "@/utils/fileProcessors";

export async function POST(request) {
  const startTime = Date.now();
  console.log(`📚 Flashcard generation started at ${new Date().toISOString()}`);

  try {
    // Parse request body with error handling
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      console.error("❌ Invalid JSON in request body:", parseError);
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    const {
      materialId,
      numFlashcards,
      title,
      description,
      generateImages,
      translateToArabic,
      selectedTopics,
    } = requestData;

    console.log(
      `📝 Generation request: ${numFlashcards} flashcards, images: ${
        generateImages ? "enabled" : "disabled"
      }, translation: ${translateToArabic ? "Arabic" : "disabled"}`
    );

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

    console.log(`📖 Content length: ${material.rawContent.length} characters`);

    // Filter content by selected topics if any topics are specified
    let contentToProcess = material.rawContent;
    if (selectedTopics && selectedTopics.length > 0) {
      console.log(
        `🎯 Filtering content by ${
          selectedTopics.length
        } selected topics: ${selectedTopics.join(", ")}`
      );
      contentToProcess = filterContentByTopics(
        material.rawContent,
        selectedTopics
      );
      console.log(
        `📖 Filtered content length: ${
          contentToProcess.length
        } characters (${Math.round(
          (contentToProcess.length / material.rawContent.length) * 100
        )}% of original)`
      );

      if (contentToProcess.length < 100) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Selected topics contain insufficient content to generate flashcards. Please select more topics or remove topic filtering.",
          },
          { status: 400 }
        );
      }
    } else {
      console.log(`📖 Using full content (no topic filtering applied)`);
    }

    // Generate flashcards using FlashcardGenerator
    console.log(`🤖 Starting flashcard generation...`);
    const flashcardStartTime = Date.now();
    // Print the filtered content as requested
    console.log(`📖 Content to process: ${contentToProcess}...`); // Print first 200 characters for brevity

    const result = await generateFlashcards(contentToProcess, flashcardParams, {
      translateToArabic,
    });

    const flashcards = result.flashcards;
    const translationInfo = result.translation;

    const flashcardDuration = Date.now() - flashcardStartTime;
    console.log(
      `✅ Flashcards generated in ${Math.round(flashcardDuration / 1000)}s: ${
        flashcards.length
      } cards`
    );

    if (translationInfo?.enabled) {
      console.log(
        `🌐 Translation to Arabic: ${
          translationInfo.stats?.successRate || 0
        }% success rate`
      );
    }

    // Generate images for flashcards if requested
    let flashcardsWithImages;
    if (generateImages && process.env.FANAR_API_KEY) {
      console.log(
        `🎨 Image generation requested for ${flashcards.length} flashcards...`
      );
      console.log(
        `⏱️  Estimated time: ${Math.round(
          (flashcards.length * 15) / 60
        )} minutes`
      );

      try {
        const imageGenerator = new ImageGenerator(process.env.FANAR_API_KEY, {
          requestDelay: 2000, // 2 seconds between image generations
        });

        const imageStartTime = Date.now();
        // Pass deck ID temporarily for better file organization
        const tempDeckId = `temp_${Date.now()}`;

        // Convert flashcard format for image generation (question/answer → front/back)
        const flashcardsForImageGen = flashcards.map((card, index) => ({
          id: `temp_${index + 1}`,
          front: card.question || "Question not available",
          back: card.answer || "Answer not available",
        }));

        const imageResults = await imageGenerator.generateFlashcardImages(
          flashcardsForImageGen,
          tempDeckId,
          false
        );
        const imageDuration = Date.now() - imageStartTime;

        // Merge flashcards with their generated images (URLs only)
        flashcardsWithImages = flashcards.map((flashcard, index) => ({
          front: flashcard.question,
          back: flashcard.answer,
          imageUrl: imageResults[index]?.imageResult?.success
            ? imageResults[index].imageResult.imageUrl
            : null,
        }));

        const successfulImages = imageResults.filter(
          (r) => r.imageResult.success
        ).length;
        console.log(
          `🎨 Image generation complete in ${Math.round(
            imageDuration / 1000
          )}s: ${successfulImages}/${flashcards.length} images generated`
        );
      } catch (imageError) {
        console.error("❌ Image generation failed:", imageError);
        console.log("📝 Proceeding with flashcards without images...");
        // Continue without images if generation fails - convert format to match database schema
        flashcardsWithImages = flashcards.map((flashcard) => ({
          front: flashcard.question,
          back: flashcard.answer,
          imageUrl: null,
        }));
      }
    } else {
      // No images requested - just convert flashcard format to match database schema
      flashcardsWithImages = flashcards.map((flashcard) => ({
        front: flashcard.question,
        back: flashcard.answer,
        imageUrl: null,
      }));
    }

    // Create the flashcard deck in the database
    console.log(`💾 Saving to database...`);
    const dbStartTime = Date.now();

    const deck = await prisma.flashcardDeck.create({
      data: {
        title: flashcardParams.title,
        description: flashcardParams.description,
        materialId: material.id,
        flashcards: {
          create: flashcardsWithImages,
        },
      },
      include: {
        flashcards: true,
      },
    });

    const dbDuration = Date.now() - dbStartTime;
    const totalDuration = Date.now() - startTime;

    console.log(
      `💾 Database save completed in ${Math.round(dbDuration / 1000)}s`
    );
    console.log(
      `🎉 Total generation completed in ${Math.round(
        totalDuration / 1000
      )}s (${Math.round(totalDuration / 60000)}m)`
    );
    return NextResponse.json({
      success: true,
      deck,
      translation: translationInfo,
      timing: {
        total: totalDuration,
        flashcards: flashcardDuration,
        images: generateImages
          ? Date.now() - (flashcardStartTime + flashcardDuration)
          : 0,
        database: dbDuration,
      },
    });
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(
      `❌ Flashcard generation failed after ${Math.round(
        totalDuration / 1000
      )}s:`,
      error
    );

    // Provide more specific error messages
    let errorMessage = "Failed to generate flashcards";
    let statusCode = 500;

    if (
      error.message.includes("timeout") ||
      error.message.includes("network")
    ) {
      errorMessage =
        "Generation timed out. This can happen with image generation. Try with fewer flashcards or disable images.";
      statusCode = 504;
    } else if (error.message.includes("API") || error.message.includes("key")) {
      errorMessage =
        "API service temporarily unavailable. Please try again in a few moments.";
      statusCode = 503;
    } else if (
      error.message.includes("content") ||
      error.message.includes("material")
    ) {
      errorMessage =
        "The material content cannot be processed. Please check if the material has sufficient text content.";
      statusCode = 422;
    } else {
      errorMessage = error.message || "Failed to generate flashcards";
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
        timing: {
          failed_after: totalDuration,
        },
      },
      { status: statusCode }
    );
  }
}

/**
 * Generate flashcards using FlashcardGenerator with smart chunking and optional translation
 */
async function generateFlashcards(content, params, options = {}) {
  const { numFlashcards, title } = params;
  const { translateToArabic = false } = options;

  console.log(`🔄 Starting flashcard generation with smart chunking...`);
  console.log(
    `📊 Content: ${content.length} characters, Target: ${numFlashcards} flashcards`
  );
  if (translateToArabic) {
    console.log(`🌐 Arabic translation requested`);
  }

  try {
    // Create generator with optimized settings for token safety
    const generator = new FlashcardGenerator(process.env.FANAR_API_KEY, {
      maxInputTokens: 2500, // Very conservative input limit
      maxCompletionTokens: 800, // Safe completion tokens
      temperature: 0.3,
      requestDelay: 1500,
      minChunksForDiversity: Math.max(6, Math.ceil(numFlashcards / 3)), // More chunks for better diversity
    });

    // Generate flashcards with optional translation
    const result = await generator.generateFlashcardsWithTranslation(
      content,
      numFlashcards,
      {
        translateToArabic,
        translationApiKey: process.env.FANAR_API_KEY, // Use same API key for translation
      }
    );

    console.log(
      `✅ Smart generation complete: ${result.flashcards.length}/${numFlashcards} flashcards`
    );
    console.log(
      `📈 Success rate: ${Math.round(
        (result.flashcards.length / numFlashcards) * 100
      )}%`
    );

    return result;
  } catch (error) {
    console.error("❌ Smart generation failed:", error.message);
    throw error;
  }
}