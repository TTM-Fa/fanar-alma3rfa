import { NextResponse } from "next/server";
import { prisma } from "@/utils/database";
import FlashcardGenerator from "@/utils/FlashcardGenerator";
import ImageGenerator from "@/utils/ImageGenerator";

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

    const { materialId, numFlashcards, title, description, generateImages } = requestData;

    console.log(`📝 Generation request: ${numFlashcards} flashcards, images: ${generateImages ? 'enabled' : 'disabled'}`);

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

    // Generate flashcards using FlashcardGenerator
    console.log(`🤖 Starting flashcard generation...`);
    const flashcardStartTime = Date.now();
    
    const flashcards = await generateFlashcards(
      material.rawContent,
      flashcardParams
    );

    const flashcardDuration = Date.now() - flashcardStartTime;
    console.log(`✅ Flashcards generated in ${Math.round(flashcardDuration / 1000)}s: ${flashcards.length} cards`);

    // Generate images for flashcards if requested
    let flashcardsWithImages = flashcards;
    if (generateImages && process.env.FANAR_API_KEY) {
      console.log(`🎨 Image generation requested for ${flashcards.length} flashcards...`);
      console.log(`⏱️  Estimated time: ${Math.round(flashcards.length * 15 / 60)} minutes`);
      
      try {        const imageGenerator = new ImageGenerator(process.env.FANAR_API_KEY, {
          requestDelay: 2000 // 2 seconds between image generations
        });
        
        const imageStartTime = Date.now();
        
        // Pass deck ID temporarily for better file organization
        const tempDeckId = `temp_${Date.now()}`;
        const imageResults = await imageGenerator.generateFlashcardImages(flashcards, tempDeckId, false);
        const imageDuration = Date.now() - imageStartTime;

        // Merge flashcards with their generated images (URLs only)
        flashcardsWithImages = imageResults.map(result => ({
          front: result.flashcard.front,
          back: result.flashcard.back,
          imageUrl: result.imageResult.success ? result.imageResult.imageUrl : null
        }));
        
        const successfulImages = imageResults.filter(r => r.imageResult.success).length;
        console.log(`🎨 Image generation complete in ${Math.round(imageDuration / 1000)}s: ${successfulImages}/${flashcards.length} images generated`);
        
      } catch (imageError) {
        console.error("❌ Image generation failed:", imageError);
        console.log("📝 Proceeding with flashcards without images...");
        // Continue without images if generation fails
      }
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
    
    console.log(`💾 Database save completed in ${Math.round(dbDuration / 1000)}s`);
    console.log(`🎉 Total generation completed in ${Math.round(totalDuration / 1000)}s (${Math.round(totalDuration / 60000)}m)`);

    return NextResponse.json({
      success: true,
      deck,
      timing: {
        total: totalDuration,
        flashcards: flashcardDuration,
        images: generateImages ? (Date.now() - (flashcardStartTime + flashcardDuration)) : 0,
        database: dbDuration
      }
    });  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`❌ Flashcard generation failed after ${Math.round(totalDuration / 1000)}s:`, error);
    
    // Provide more specific error messages
    let errorMessage = "Failed to generate flashcards";
    let statusCode = 500;
    
    if (error.message.includes("timeout") || error.message.includes("network")) {
      errorMessage = "Generation timed out. This can happen with image generation. Try with fewer flashcards or disable images.";
      statusCode = 504;
    } else if (error.message.includes("API") || error.message.includes("key")) {
      errorMessage = "API service temporarily unavailable. Please try again in a few moments.";
      statusCode = 503;
    } else if (error.message.includes("content") || error.message.includes("material")) {
      errorMessage = "The material content cannot be processed. Please check if the material has sufficient text content.";
      statusCode = 422;
    } else {
      errorMessage = error.message || "Failed to generate flashcards";
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timing: {
          failed_after: totalDuration
        }
      },
      { status: statusCode }
    );
  }
}

/**
 * Generate flashcards using FlashcardGenerator (Fanar API)
 * Ensures equal representation from all sections of the content
 */
async function generateFlashcards(content, params) {
  const { numFlashcards, title } = params;

  // First, create chunks to understand content distribution
  const tempGenerator = new FlashcardGenerator(process.env.FANAR_API_KEY, {
    flashcardsPerChunk: 1, // Temporary, just for chunking
    safeTokenLimit: 4000,
    temperature: 0.3,
    requestDelay: 1000
  });

  const chunks = tempGenerator.createChunks(content);
  const totalChunks = chunks.length;
  
  console.log(`Content analysis: ${totalChunks} chunks identified from ${content.length} characters`);
    // Calculate equal distribution strategy with guaranteed minimum representation
  const minCardsPerChunk = Math.min(1, Math.floor(numFlashcards / totalChunks));
  const baseCardsPerChunk = Math.floor(numFlashcards / totalChunks);
  const remainderCards = numFlashcards % totalChunks;
  
  // Ensure every chunk gets at least one card when possible
  const chunkCardDistribution = chunks.map((chunk, index) => {
    let targetCards = baseCardsPerChunk + (index < remainderCards ? 1 : 0);
    
    // For very small requests, ensure fair round-robin distribution
    if (numFlashcards < totalChunks && index < numFlashcards) {
      targetCards = 1;
    } else if (numFlashcards < totalChunks && index >= numFlashcards) {
      targetCards = 0;
    }
    
    return {
      ...chunk,
      targetCards: Math.max(targetCards, minCardsPerChunk),
      contentWeight: chunk.tokens / Math.max(...chunks.map(c => c.tokens)) // Relative content density
    };
  });
  console.log(`Distribution strategy (${numFlashcards} total flashcards):`);
  chunkCardDistribution.forEach(chunk => {
    const contentType = determineContentType(chunk.content);
    console.log(`  Chunk ${chunk.index}: ${chunk.targetCards} flashcards (${Math.round(chunk.tokens)} tokens, ${contentType})`);
  });

  try {
    const allFlashcards = [];
      // Process each chunk with its specific target
    for (const chunkInfo of chunkCardDistribution) {
      if (chunkInfo.targetCards === 0) continue; // Skip if no cards assigned
        // Create generator for this specific chunk with adaptive settings
      const isContentRich = chunkInfo.tokens > 2000;
      const extraCards = Math.min(chunkInfo.targetCards, 3); // Generate extra for better selection
      const chunkGenerator = new FlashcardGenerator(process.env.FANAR_API_KEY, {
        flashcardsPerChunk: chunkInfo.targetCards + extraCards, // Generate significantly more for selection
        safeTokenLimit: 4000,
        temperature: isContentRich ? 0.3 : 0.4, // Higher temp for smaller content
        requestDelay: 1000
      });

      console.log(`Processing chunk ${chunkInfo.index}/${totalChunks} - targeting ${chunkInfo.targetCards} flashcards...`);
      
      // Process this single chunk
      const singleChunkResult = await chunkGenerator.generateFlashcards(chunkInfo.content);
      
      if (singleChunkResult.success && singleChunkResult.flashcards.length > 0) {
        // Select the best flashcards for this chunk (prefer variety)
        const chunkCards = selectBestFlashcards(
          singleChunkResult.flashcards,
          chunkInfo.targetCards,
          chunkInfo.index,
          chunkInfo.tokens
        );
        
        allFlashcards.push(...chunkCards);
        console.log(`  ✅ Generated ${chunkCards.length} flashcards from chunk ${chunkInfo.index}`);
      } else {
        console.log(`  ⚠️ No flashcards generated from chunk ${chunkInfo.index}`);
      }
      
      // Rate limiting between chunks
      if (chunkInfo.index < totalChunks) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    console.log(`\nFirst pass complete: ${allFlashcards.length}/${numFlashcards} flashcards generated`);
      // If we're still short, do aggressive targeted generation to guarantee the count
    if (allFlashcards.length < numFlashcards) {
      const shortfall = numFlashcards - allFlashcards.length;
      console.log(`Attempting to fill shortfall of ${shortfall} flashcards...`);
      
      // Use all available chunks for supplemental generation
      const availableChunks = chunkCardDistribution.filter(chunk => chunk.targetCards > 0);
      let supplementRound = 1;
      
      while (allFlashcards.length < numFlashcards && supplementRound <= 3) {
        console.log(`  Supplemental round ${supplementRound}: Need ${numFlashcards - allFlashcards.length} more flashcards`);
        
        for (const targetChunk of availableChunks) {
          if (allFlashcards.length >= numFlashcards) break;
          
          const currentShortfall = numFlashcards - allFlashcards.length;
          const cardsToGenerate = Math.min(Math.max(currentShortfall, 3), 8); // Generate 3-8 cards per attempt
          
          const supplementGenerator = new FlashcardGenerator(process.env.FANAR_API_KEY, {
            flashcardsPerChunk: cardsToGenerate,
            safeTokenLimit: 4000,
            temperature: 0.4 + (supplementRound * 0.1), // Increase variety each round
            requestDelay: 1000
          });
          
          console.log(`    Processing chunk ${targetChunk.index} (round ${supplementRound}) - generating ${cardsToGenerate} flashcards...`);
          
          try {
            const supplementResult = await supplementGenerator.generateFlashcards(targetChunk.content);
              if (supplementResult.success && supplementResult.flashcards.length > 0) {
              // Add new cards that aren't duplicates (use relaxed mode for supplemental rounds)
              const newCards = supplementResult.flashcards
                .filter(newCard => !isDuplicateCard(newCard, allFlashcards, supplementRound > 1))
                .map(card => ({
                  front: card.front,
                  back: card.back,
                  sourceChunk: targetChunk.index,
                  chunkTokens: targetChunk.tokens
                }));
              
              // Take as many as we need, up to what we generated
              const cardsToAdd = newCards.slice(0, numFlashcards - allFlashcards.length);
              allFlashcards.push(...cardsToAdd);
              
              console.log(`    ✅ Added ${cardsToAdd.length} new flashcards from chunk ${targetChunk.index} (${newCards.length - cardsToAdd.length} filtered as duplicates)`);
            } else {
              console.log(`    ⚠️ No flashcards generated from chunk ${targetChunk.index} in round ${supplementRound}`);
            }
          } catch (error) {
            console.log(`    ❌ Error generating from chunk ${targetChunk.index}: ${error.message}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 1200));
        }
          supplementRound++;
      }
      
      // Final status check
      if (allFlashcards.length < numFlashcards) {
        console.log(`⚠️ Warning: After ${supplementRound - 1} supplemental rounds, still short by ${numFlashcards - allFlashcards.length} flashcards`);
        console.log(`   This may indicate limited content diversity or API generation constraints.`);
      } else {
        console.log(`✅ Successfully reached target: ${allFlashcards.length}/${numFlashcards} flashcards`);
      }
    }

    // Final cleanup and deduplication
    const uniqueFlashcards = removeDuplicateCards(allFlashcards);
    
    // Ensure balanced representation in final selection
    let finalFlashcards;
    if (uniqueFlashcards.length >= numFlashcards) {
      finalFlashcards = ensureBalancedSelection(uniqueFlashcards, numFlashcards, totalChunks);
    } else {
      finalFlashcards = uniqueFlashcards;
    }

    // Remove the source tracking metadata before returning
    const cleanFlashcards = finalFlashcards.map(card => ({
      front: card.front,
      back: card.back
    }));

    // Log final distribution
    logFinalDistribution(finalFlashcards, totalChunks);

    console.log(`✅ Final result: ${cleanFlashcards.length} flashcards with balanced content representation`);
      return cleanFlashcards;

  } catch (error) {
    console.error("FlashcardGenerator error:", error);
    throw new Error(`Failed to generate flashcards: ${error.message}`);
  }
}

/**
 * Determine content type for better flashcard generation
 */
function determineContentType(content) {
  const text = content.toLowerCase();
  
  if (text.includes('introduction') || text.includes('overview')) return 'Introduction';
  if (text.includes('method') || text.includes('procedure') || text.includes('algorithm')) return 'Methods';
  if (text.includes('result') || text.includes('finding') || text.includes('data')) return 'Results';
  if (text.includes('conclusion') || text.includes('summary') || text.includes('future')) return 'Conclusions';
  if (text.includes('application') || text.includes('example') || text.includes('case')) return 'Applications';
  if (text.includes('theory') || text.includes('concept') || text.includes('principle')) return 'Theory';
  
  return 'Content';
}

/**
 * Select the best flashcards from a chunk's generation results
 */
function selectBestFlashcards(generatedCards, targetCount, chunkIndex, chunkTokens) {
  // Score flashcards based on quality indicators
  const scoredCards = generatedCards.map(card => {
    let score = 0;
    
    // Prefer cards with reasonable length (not too short, not too long)
    const frontLength = card.front.length;
    const backLength = card.back.length;
    
    if (frontLength >= 10 && frontLength <= 150) score += 2;
    if (backLength >= 15 && backLength <= 300) score += 2;
    
    // Prefer cards with specific content (not generic)
    if (card.front.includes('what') || card.front.includes('how') || card.front.includes('why')) score += 1;
    if (card.back.includes('because') || card.back.includes('method') || card.back.includes('process')) score += 1;
    
    // Avoid overly simple cards
    if (card.front.split(' ').length < 3) score -= 1;
    if (card.back.split(' ').length < 4) score -= 1;
    
    return {
      ...card,
      score,
      sourceChunk: chunkIndex,
      chunkTokens
    };
  });
  
  // Sort by score and take the best ones
  const bestCards = scoredCards
    .sort((a, b) => b.score - a.score)
    .slice(0, targetCount);
  
  return bestCards;
}

/**
 * Ensure balanced selection across all chunks when we have excess flashcards
 */
function ensureBalancedSelection(flashcards, targetCount, totalChunks) {
  // Group flashcards by source chunk
  const cardsByChunk = {};
  flashcards.forEach(card => {
    const chunk = card.sourceChunk || 0;
    if (!cardsByChunk[chunk]) cardsByChunk[chunk] = [];
    cardsByChunk[chunk].push(card);
  });

  const selectedCards = [];
  const cardsPerChunk = Math.floor(targetCount / totalChunks);
  let remainingSlots = targetCount;

  // First pass: take equal amount from each chunk
  Object.keys(cardsByChunk).forEach(chunkKey => {
    const chunkCards = cardsByChunk[chunkKey];
    const takeCount = Math.min(cardsPerChunk, chunkCards.length, remainingSlots);
    
    selectedCards.push(...chunkCards.slice(0, takeCount));
    remainingSlots -= takeCount;
  });

  // Second pass: fill remaining slots with round-robin
  let chunkIndex = 0;
  const chunkKeys = Object.keys(cardsByChunk);
  
  while (remainingSlots > 0 && chunkKeys.length > 0) {
    const currentChunk = chunkKeys[chunkIndex % chunkKeys.length];
    const chunkCards = cardsByChunk[currentChunk];
    const alreadySelected = selectedCards.filter(card => card.sourceChunk == currentChunk).length;
    
    if (alreadySelected < chunkCards.length) {
      selectedCards.push(chunkCards[alreadySelected]);
      remainingSlots--;
    }
    
    chunkIndex++;
    
    // Prevent infinite loop
    if (chunkIndex > chunkKeys.length * 10) break;
  }

  return selectedCards.slice(0, targetCount);
}

/**
 * Check if a flashcard is a duplicate (with optional relaxed mode for supplemental generation)
 */
function isDuplicateCard(newCard, existingCards, relaxed = false) {
  const newFront = newCard.front.toLowerCase().trim().replace(/[^\w\s]/g, '');
  const threshold = relaxed ? 0.90 : 0.85; // Stricter similarity check for supplemental rounds
  
  return existingCards.some(existingCard => {
    const existingFront = existingCard.front.toLowerCase().trim().replace(/[^\w\s]/g, '');
    const similarity = calculateSimilarity(newFront, existingFront);
    return similarity > threshold;
  });
}

/**
 * Log the final distribution of flashcards across chunks
 */
function logFinalDistribution(flashcards, totalChunks) {
  console.log(`\nFinal distribution across ${totalChunks} content sections:`);
  
  const distribution = {};
  flashcards.forEach(card => {
    const chunk = card.sourceChunk || 0;
    distribution[chunk] = (distribution[chunk] || 0) + 1;
  });
  
  Object.keys(distribution).sort((a, b) => Number(a) - Number(b)).forEach(chunk => {
    const percentage = ((distribution[chunk] / flashcards.length) * 100).toFixed(1);
    console.log(`  Section ${chunk}: ${distribution[chunk]} flashcards (${percentage}%)`);
  });
}

/**
 * Remove duplicate flashcards based on front text similarity
 */
function removeDuplicateCards(flashcards) {
  const unique = [];
  const seen = new Set();
  
  for (const card of flashcards) {
    const frontKey = card.front.toLowerCase().trim().replace(/[^\w\s]/g, '');
    
    // Check for exact matches and very similar questions
    const isDuplicate = Array.from(seen).some(seenKey => {
      const similarity = calculateSimilarity(frontKey, seenKey);
      return similarity > 0.85; // 85% similarity threshold
    });
    
    if (!isDuplicate) {
      unique.push(card);
      seen.add(frontKey);
    }
  }
  
  return unique;
}

/**
 * Calculate text similarity (simple Jaccard similarity)
 */
function calculateSimilarity(str1, str2) {
  const set1 = new Set(str1.split(' '));
  const set2 = new Set(str2.split(' '));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}
