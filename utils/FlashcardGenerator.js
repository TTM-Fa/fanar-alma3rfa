import axios from "axios";
import TranslationService from "./TranslationService.js";

/**
 * Smart Flashcard Generator with Advanced Chunking
 * Provides diverse, balanced, and token-safe flashcard generation
 */
class FlashcardGenerator {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.apiUrl = options.apiUrl || "https://api.fanar.qa/v1/chat/completions";
    this.model = options.model || "Fanar-S-1-7B";

    // Conservative token settings for reliable API calls
    this.charsPerToken = options.charsPerToken || 4;
    this.maxInputTokens = options.maxInputTokens || 2500; // Very conservative for input
    this.maxCompletionTokens = options.maxCompletionTokens || 800; // For flashcard generation
    this.overlapTokens = options.overlapTokens || 100; // Overlap between chunks
    this.temperature = options.temperature || 0.3;
    this.requestDelay = options.requestDelay || 1500;

    // Smart chunking parameters
    this.minFlashcardsPerChunk = 2;
    this.maxFlashcardsPerChunk = 4;
    this.minChunksForDiversity = options.minChunksForDiversity || 6; // Minimum chunks for good content diversity
    this.targetChunkOverlap = 0.1; // 10% overlap between adjacent chunks
  }

  /**
   * Estimate token count from text
   */
  estimateTokens(text) {
    return Math.ceil(text.length / this.charsPerToken);
  }

  /**
   * Get safe character limit for chunks
   */
  getSafeCharLimit() {
    return Math.floor(this.maxInputTokens * this.charsPerToken * 0.9);
  }

  /**
   * Calculate optimal chunking strategy for diverse flashcard generation
   */
  calculateSmartChunking(text, targetFlashcards) {
    const totalChars = text.length;
    const totalTokens = this.estimateTokens(text);
    const safeCharLimit = this.getSafeCharLimit();

    console.log(`📊 Smart Chunking Analysis:`);
    console.log(`   Text length: ${totalChars.toLocaleString()} chars`);
    console.log(`   Estimated tokens: ${totalTokens.toLocaleString()}`);
    console.log(
      `   Safe char limit per chunk: ${safeCharLimit.toLocaleString()}`
    );
    console.log(`   Target flashcards: ${targetFlashcards}`);

    // Calculate minimum chunks needed
    const chunksNeededForSize = Math.ceil(totalChars / safeCharLimit);
    const chunksNeededForDiversity = Math.max(
      this.minChunksForDiversity,
      Math.ceil(targetFlashcards / this.maxFlashcardsPerChunk)
    );
    const minChunks = Math.max(chunksNeededForSize, chunksNeededForDiversity);

    // Optimize for better distribution - create more chunks for diversity
    const optimalChunks = Math.min(
      Math.ceil(targetFlashcards / 2), // 2 flashcards per chunk on average
      Math.ceil(totalChars / (safeCharLimit * 0.7)) // Use 70% of safe limit for smaller chunks
    );

    const finalChunkCount = Math.max(minChunks, optimalChunks);

    // Calculate chunk size and overlap
    const baseChunkSize = Math.floor(totalChars / finalChunkCount);
    const overlapSize = Math.floor(baseChunkSize * this.targetChunkOverlap);

    // Distribute flashcards evenly across chunks
    const baseFlashcardsPerChunk = Math.floor(
      targetFlashcards / finalChunkCount
    );
    const extraFlashcards = targetFlashcards % finalChunkCount;

    console.log(`   Final chunk count: ${finalChunkCount}`);
    console.log(
      `   Chunk size: ~${baseChunkSize.toLocaleString()} chars (+ ${overlapSize} overlap)`
    );
    console.log(
      `   Flashcards per chunk: ${baseFlashcardsPerChunk} (+ ${extraFlashcards} distributed)`
    );

    return {
      chunkCount: finalChunkCount,
      chunkSize: baseChunkSize,
      overlapSize: overlapSize,
      baseFlashcardsPerChunk: Math.max(
        this.minFlashcardsPerChunk,
        baseFlashcardsPerChunk
      ),
      extraFlashcards: extraFlashcards,
    };
  }

  /**
   * Create smart overlapping chunks with distributed positions
   */
  createSmartChunks(text, strategy) {
    const chunks = [];
    const { chunkCount, chunkSize, overlapSize } = strategy;
    const totalLength = text.length;

    // Create chunks with strategic positioning for diversity
    for (let i = 0; i < chunkCount; i++) {
      // Calculate start position with slight randomization for diversity
      const baseStart = i * (chunkSize - overlapSize);
      const maxOffset = Math.min(
        chunkSize * 0.1,
        totalLength - baseStart - chunkSize
      );
      const randomOffset = Math.floor(Math.random() * maxOffset);
      let start = Math.max(0, baseStart + randomOffset);

      // Calculate end position
      let end = Math.min(start + chunkSize + overlapSize, totalLength);

      // Adjust boundaries to word boundaries
      if (start > 0) {
        const adjustedStart = this.findWordBoundary(text, start, true);
        start = adjustedStart;
      }

      if (end < totalLength) {
        const adjustedEnd = this.findWordBoundary(text, end, false);
        end = adjustedEnd;
      }

      const chunkText = text.slice(start, end).trim();

      if (chunkText.length > 100) {
        // Minimum viable chunk size
        chunks.push({
          id: i + 1,
          text: chunkText,
          start: start,
          end: end,
          tokens: this.estimateTokens(chunkText),
        });
      }
    }

    console.log(`📦 Created ${chunks.length} smart chunks:`);
    chunks.forEach((chunk) => {
      console.log(
        `   Chunk ${chunk.id}: ${chunk.text.length} chars, ~${chunk.tokens} tokens`
      );
    });

    return chunks;
  }

  /**
   * Find word boundary near position
   */
  findWordBoundary(text, position, searchBackward = false) {
    const direction = searchBackward ? -1 : 1;
    const maxSearch = 100; // Don't search too far

    for (let i = 0; i < maxSearch; i++) {
      const pos = position + i * direction;
      if (pos < 0 || pos >= text.length) break;

      const char = text[pos];
      if (/\s/.test(char) || char === "." || char === "!" || char === "?") {
        return searchBackward ? pos + 1 : pos;
      }
    }

    return position; // Fallback to original position
  }
  /**
   * Generate flashcards for a single chunk
   */
  async generateFlashcardsForChunk(
    chunkText,
    flashcardCount,
    chunkIndex,
    additionalInstruction = ""
  ) {
    const systemPrompt = `You are an expert educational content creator. Generate exactly ${flashcardCount} high-quality flashcards from the provided text.

CRITICAL REQUIREMENTS:
- Generate EXACTLY ${flashcardCount} flashcards - no more, no less
- Each flashcard must have a clear, specific question and a complete, accurate answer
- Focus on key concepts, definitions, important facts, and relationships
- Questions should test understanding, not just memorization
- Answers should be comprehensive but concise
- Vary question types (what, how, why, when, where)
- Ensure questions are self-contained and don't require external context
${
  additionalInstruction
    ? `\nADDITIONAL INSTRUCTION: ${additionalInstruction}`
    : ""
}

RESPONSE FORMAT (JSON):
{
  "flashcards": [
    {
      "question": "Clear, specific question",
      "answer": "Complete, accurate answer"
    }
  ]
}

IMPORTANT: Return exactly ${flashcardCount} flashcard objects in the array.`;

    const userPrompt = `Generate exactly ${flashcardCount} flashcards from this text:\n\n${chunkText}`;

    try {
      console.log(
        `🔄 Generating ${flashcardCount} flashcards for chunk ${
          chunkIndex + 1
        }...`
      );

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: this.temperature,
          max_tokens: this.maxCompletionTokens,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 60000,
        }
      );

      const content = response.data.choices[0].message.content;
      console.log(
        `✅ Raw response for chunk ${chunkIndex + 1}:`,
        content.substring(0, 200) + "..."
      );

      // Parse JSON response with expected count limit
      const parsed = this.parseFlashcardResponse(content, flashcardCount);

      if (parsed && parsed.flashcards && Array.isArray(parsed.flashcards)) {
        const actualCount = parsed.flashcards.length;
        if (actualCount > flashcardCount) {
          console.warn(
            `⚠️ API returned ${actualCount} flashcards, expected ${flashcardCount}. Limited to ${flashcardCount}.`
          );
        }
        console.log(
          `✅ Successfully generated ${Math.min(
            actualCount,
            flashcardCount
          )} flashcards for chunk ${chunkIndex + 1}`
        );
        return parsed.flashcards.slice(0, flashcardCount); // Extra safety limit
      } else {
        console.error(`❌ Invalid response format for chunk ${chunkIndex + 1}`);
        return [];
      }
    } catch (error) {
      console.error(
        `❌ Error generating flashcards for chunk ${chunkIndex + 1}:`,
        error.message
      );

      if (error.response) {
        console.error("API Error Response:", error.response.data);
      }

      return [];
    }
  }
  /**
   * Parse flashcard response with multiple fallback strategies
   */
  parseFlashcardResponse(content, expectedCount = null) {
    try {
      // First, try direct JSON parsing
      const parsed = JSON.parse(content);
      if (parsed.flashcards && Array.isArray(parsed.flashcards)) {
        // Limit to expected count if specified
        const flashcards = expectedCount
          ? parsed.flashcards.slice(0, expectedCount)
          : parsed.flashcards;
        return { flashcards };
      }
      return parsed;
    } catch (e) {
      console.log("Direct JSON parsing failed, trying cleanup...");
    }

    try {
      // Clean up common issues
      let cleaned = content.trim();

      // Remove markdown code blocks
      cleaned = cleaned.replace(/```json\s*/g, "").replace(/```\s*/g, "");

      // Find JSON object
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.flashcards && Array.isArray(parsed.flashcards)) {
          // Limit to expected count if specified
          const flashcards = expectedCount
            ? parsed.flashcards.slice(0, expectedCount)
            : parsed.flashcards;
          return { flashcards };
        }
        return parsed;
      }
    } catch (e) {
      console.log("Cleanup parsing failed, trying extraction...");
    }

    try {
      // Extract flashcards manually if JSON parsing fails
      const questionRegex = /"question":\s*"([^"]+)"/g;
      const answerRegex = /"answer":\s*"([^"]+)"/g;

      const questions = [];
      const answers = [];

      let questionMatch;
      while ((questionMatch = questionRegex.exec(content)) !== null) {
        questions.push(questionMatch[1]);
        // Limit extraction if expected count is specified
        if (expectedCount && questions.length >= expectedCount) break;
      }

      let answerMatch;
      while ((answerMatch = answerRegex.exec(content)) !== null) {
        answers.push(answerMatch[1]);
        // Limit extraction if expected count is specified
        if (expectedCount && answers.length >= expectedCount) break;
      }

      if (questions.length === answers.length && questions.length > 0) {
        const flashcards = questions.map((question, index) => ({
          question: question,
          answer: answers[index],
        }));

        // Final safety limit
        const limitedFlashcards = expectedCount
          ? flashcards.slice(0, expectedCount)
          : flashcards;
        console.log(
          `🔧 Manual extraction: found ${flashcards.length}, limited to ${limitedFlashcards.length}`
        );

        return { flashcards: limitedFlashcards };
      }
    } catch (e) {
      console.error("All parsing methods failed:", e.message);
    }

    return { flashcards: [] };
  }
  /**
   * Main method to generate flashcards using smart chunking with count guarantee
   */
  async generateFlashcards(text, targetCount) {
    console.log(`🚀 Starting smart flashcard generation...`);
    console.log(`📋 Target: ${targetCount} flashcards`);

    // Calculate smart chunking strategy
    const strategy = this.calculateSmartChunking(text, targetCount);

    // Create smart chunks
    const chunks = this.createSmartChunks(text, strategy);

    if (chunks.length === 0) {
      throw new Error("Failed to create valid chunks from the text");
    }

    // Phase 1: Initial generation with planned distribution
    console.log(`📋 Phase 1: Initial generation with ${chunks.length} chunks`);
    const allFlashcards = await this.generateInitialFlashcards(
      chunks,
      strategy
    );

    // Remove duplicates
    const uniqueFlashcards = this.removeDuplicateFlashcards(allFlashcards);
    console.log(
      `🔍 After deduplication: ${uniqueFlashcards.length} unique flashcards`
    );

    // Phase 2: Fill gaps if we're under the target
    const finalFlashcards = await this.ensureTargetCount(
      uniqueFlashcards,
      targetCount,
      chunks,
      text
    );

    console.log(
      `🎯 Generation complete: ${finalFlashcards.length}/${targetCount} flashcards created`
    );
    console.log(
      `📊 Success rate: ${Math.round(
        (finalFlashcards.length / targetCount) * 100
      )}%`
    );

    return finalFlashcards;
  }

  /**
   * Generate flashcards from chunks with planned distribution
   */
  async generateInitialFlashcards(chunks, strategy) {
    const allFlashcards = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Calculate flashcards for this chunk
      let flashcardsForThisChunk = strategy.baseFlashcardsPerChunk;
      if (i < strategy.extraFlashcards) {
        flashcardsForThisChunk += 1;
      }

      // Ensure we don't exceed max per chunk
      flashcardsForThisChunk = Math.min(
        flashcardsForThisChunk,
        this.maxFlashcardsPerChunk
      );

      try {
        const chunkFlashcards = await this.generateFlashcardsForChunk(
          chunk.text,
          flashcardsForThisChunk,
          i
        );

        if (chunkFlashcards && chunkFlashcards.length > 0) {
          allFlashcards.push(...chunkFlashcards);
          console.log(
            `✅ Added ${chunkFlashcards.length} flashcards from chunk ${i + 1}`
          );
        } else {
          console.warn(`⚠️ No flashcards generated from chunk ${i + 1}`);
        }

        // Rate limiting delay
        if (i < chunks.length - 1) {
          console.log(
            `⏱️ Waiting ${this.requestDelay}ms before next request...`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, this.requestDelay)
          );
        }
      } catch (error) {
        console.error(`❌ Failed to process chunk ${i + 1}:`, error.message);
        continue;
      }
    }

    return allFlashcards;
  }

  /**
   * Ensure we reach the exact target count through gap-filling strategies
   */
  async ensureTargetCount(
    currentFlashcards,
    targetCount,
    chunks,
    originalText
  ) {
    const currentCount = currentFlashcards.length;

    if (currentCount >= targetCount) {
      console.log(
        `✅ Target reached: ${currentCount}/${targetCount} flashcards`
      );
      return currentFlashcards.slice(0, targetCount);
    }

    const shortfall = targetCount - currentCount;
    console.log(
      `📋 Phase 2: Need ${shortfall} more flashcards to reach target of ${targetCount}`
    );

    let additionalFlashcards = [];

    // Strategy 1: Generate additional flashcards from underutilized chunks
    if (shortfall > 0 && chunks.length > 0) {
      console.log(
        `🔄 Strategy 1: Generating additional flashcards from existing chunks`
      );
      additionalFlashcards = await this.generateAdditionalFromChunks(
        chunks,
        shortfall,
        currentFlashcards
      );
    }

    // Strategy 2: If still short, create new targeted chunks for gap filling
    if (additionalFlashcards.length < shortfall && originalText.length > 1000) {
      const remainingShortfall = shortfall - additionalFlashcards.length;
      console.log(
        `🔄 Strategy 2: Creating targeted chunks for ${remainingShortfall} more flashcards`
      );

      const targetedFlashcards = await this.generateFromTargetedChunks(
        originalText,
        remainingShortfall,
        currentFlashcards.concat(additionalFlashcards)
      );

      additionalFlashcards = additionalFlashcards.concat(targetedFlashcards);
    }

    // Combine and deduplicate all flashcards
    const allFlashcards = currentFlashcards.concat(additionalFlashcards);
    const finalUnique = this.removeDuplicateFlashcards(allFlashcards);

    // If we're still short but close, prioritize the best flashcards
    if (finalUnique.length < targetCount) {
      console.log(
        `⚠️ Final count ${finalUnique.length} is still short of ${targetCount}`
      );
      console.log(`✅ Returning ${finalUnique.length} high-quality flashcards`);
    }

    return finalUnique.slice(0, targetCount);
  }

  /**
   * Generate additional flashcards from existing chunks
   */
  async generateAdditionalFromChunks(chunks, needed, existingFlashcards) {
    const additionalFlashcards = [];
    const existingQuestions = new Set(
      existingFlashcards.map((f) => f.question.toLowerCase().trim())
    );

    // Try to get more flashcards from the largest chunks
    const sortedChunks = chunks
      .map((chunk, index) => ({ ...chunk, originalIndex: index }))
      .sort((a, b) => b.text.length - a.text.length);

    for (
      let i = 0;
      i < sortedChunks.length && additionalFlashcards.length < needed;
      i++
    ) {
      const chunk = sortedChunks[i];
      const flashcardsToRequest = Math.min(
        3,
        needed - additionalFlashcards.length
      );

      try {
        console.log(
          `🔄 Requesting ${flashcardsToRequest} additional flashcards from chunk ${
            chunk.originalIndex + 1
          }`
        );

        const chunkFlashcards = await this.generateFlashcardsForChunk(
          chunk.text,
          flashcardsToRequest,
          chunk.originalIndex,
          "Generate diverse flashcards that cover different aspects not covered in previous generations."
        );

        // Filter out duplicates against existing questions
        const newFlashcards = chunkFlashcards.filter(
          (card) => !existingQuestions.has(card.question.toLowerCase().trim())
        );

        if (newFlashcards.length > 0) {
          additionalFlashcards.push(...newFlashcards);
          newFlashcards.forEach((card) =>
            existingQuestions.add(card.question.toLowerCase().trim())
          );
          console.log(
            `✅ Added ${newFlashcards.length} new flashcards from chunk ${
              chunk.originalIndex + 1
            }`
          );
        }

        // Rate limiting
        if (i < sortedChunks.length - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.requestDelay)
          );
        }
      } catch (error) {
        console.error(
          `❌ Failed to generate additional flashcards from chunk ${
            chunk.originalIndex + 1
          }:`,
          error.message
        );
        continue;
      }
    }

    return additionalFlashcards;
  }

  /**
   * Generate flashcards from new targeted chunks
   */
  async generateFromTargetedChunks(text, needed, existingFlashcards) {
    const existingQuestions = new Set(
      existingFlashcards.map((f) => f.question.toLowerCase().trim())
    );

    console.log(
      `🎯 Creating ${Math.min(
        3,
        Math.ceil(needed / 2)
      )} targeted chunks for ${needed} flashcards`
    );

    // Create smaller, focused chunks from different parts of the text
    const targetedChunks = this.createTargetedChunks(
      text,
      Math.min(3, Math.ceil(needed / 2))
    );
    const additionalFlashcards = [];

    for (
      let i = 0;
      i < targetedChunks.length && additionalFlashcards.length < needed;
      i++
    ) {
      const chunk = targetedChunks[i];
      const flashcardsToRequest = Math.min(
        Math.ceil(needed / targetedChunks.length),
        needed - additionalFlashcards.length
      );

      try {
        console.log(
          `🎯 Generating ${flashcardsToRequest} targeted flashcards from chunk ${
            i + 1
          }`
        );

        const chunkFlashcards = await this.generateFlashcardsForChunk(
          chunk.text,
          flashcardsToRequest,
          i,
          "Focus on unique concepts and details that would make good study questions."
        );

        // Filter out duplicates
        const newFlashcards = chunkFlashcards.filter(
          (card) => !existingQuestions.has(card.question.toLowerCase().trim())
        );

        if (newFlashcards.length > 0) {
          additionalFlashcards.push(...newFlashcards);
          newFlashcards.forEach((card) =>
            existingQuestions.add(card.question.toLowerCase().trim())
          );
          console.log(`✅ Added ${newFlashcards.length} targeted flashcards`);
        }

        // Rate limiting
        if (i < targetedChunks.length - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.requestDelay)
          );
        }
      } catch (error) {
        console.error(
          `❌ Failed to generate targeted flashcards from chunk ${i + 1}:`,
          error.message
        );
        continue;
      }
    }

    return additionalFlashcards;
  }

  /**
   * Create targeted chunks from different sections of the text
   */
  createTargetedChunks(text, numChunks) {
    const chunks = [];
    const textLength = text.length;
    const safeChunkSize = this.getSafeCharLimit();

    // Divide text into sections and pick representative chunks
    for (let i = 0; i < numChunks; i++) {
      const sectionStart = Math.floor((textLength / numChunks) * i);
      const sectionEnd = Math.floor((textLength / numChunks) * (i + 1));
      const sectionLength = sectionEnd - sectionStart;

      // Pick a chunk from the middle of this section
      const chunkStart =
        sectionStart +
        Math.floor(Math.max(0, sectionLength - safeChunkSize) / 2);
      const chunkEnd = Math.min(chunkStart + safeChunkSize, sectionEnd);

      // Adjust to word boundaries
      const adjustedStart = this.findWordBoundary(text, chunkStart, true);
      const adjustedEnd = this.findWordBoundary(text, chunkEnd, false);

      const chunkText = text.slice(adjustedStart, adjustedEnd).trim();

      if (chunkText.length > 200) {
        chunks.push({
          id: `targeted_${i + 1}`,
          text: chunkText,
          start: adjustedStart,
          end: adjustedEnd,
          tokens: this.estimateTokens(chunkText),
        });
      }
    }

    return chunks;
  }

  /**
   * Remove duplicate flashcards based on question similarity
   */
  removeDuplicateFlashcards(flashcards) {
    const seen = new Set();
    const unique = [];

    for (const card of flashcards) {
      if (!card.question || !card.answer) continue;

      // Normalize question for comparison
      const normalizedQuestion = card.question
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, "");

      if (!seen.has(normalizedQuestion)) {
        seen.add(normalizedQuestion);
        unique.push({
          question: card.question.trim(),
          answer: card.answer.trim(),
        });
      }
    }

    console.log(
      `🔍 Removed ${flashcards.length - unique.length} duplicate flashcards`
    );
    return unique;
  }

  /**
   * Generate flashcards with optional translation
   */
  async generateFlashcardsWithTranslation(text, targetCount, options = {}) {
    const { translateToArabic = false, translationApiKey = null } = options;

    console.log(
      `🚀 Starting flashcard generation${
        translateToArabic ? " with Arabic translation" : ""
      }...`
    );

    // Generate flashcards first
    const flashcards = await this.generateFlashcards(text, targetCount);

    // Translate if requested
    if (translateToArabic && translationApiKey) {
      console.log(
        `🌐 Starting Arabic translation for ${flashcards.length} flashcards...`
      );

      try {
        const translator = new TranslationService(translationApiKey, {
          requestDelay: 800, // Slightly slower for translation API
        });

        const translatedFlashcards = await translator.translateFlashcards(
          flashcards,
          "ar"
        );

        const stats = translator.getTranslationStats(translatedFlashcards);
        console.log(
          `🌐 Translation complete: ${stats.successRate}% success rate`
        );

        return {
          flashcards: translatedFlashcards,
          translation: {
            enabled: true,
            language: "Arabic",
            stats: stats,
          },
        };
      } catch (error) {
        console.error("❌ Translation failed:", error.message);
        console.log("📝 Returning flashcards without translation");

        return {
          flashcards: flashcards,
          translation: {
            enabled: false,
            error: error.message,
          },
        };
      }
    }

    return {
      flashcards: flashcards,
      translation: {
        enabled: false,
      },
    };
  }
}

export default FlashcardGenerator;