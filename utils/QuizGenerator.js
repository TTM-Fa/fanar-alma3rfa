import axios from "axios";
import TranslationService from "./TranslationService.js";
import { OpenAI } from "openai";

/**
 * Enhanced Quiz Generator with Fanar API + OpenAI Schema Validation
 * Two-step process: Fanar generates content, OpenAI structures it properly
 */
class QuizGenerator {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.apiUrl = options.apiUrl || "https://api.fanar.qa/v1/chat/completions";
    this.model = options.model || "Fanar-S-1-7B";

    // Initialize OpenAI for schema validation
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Conservative token settings for reliable API calls
    this.charsPerToken = options.charsPerToken || 4;
    this.maxInputTokens = options.maxInputTokens || 3000; // Increased for better chunking
    this.maxCompletionTokens = options.maxCompletionTokens || 1500; // Increased for multiple questions
    this.overlapTokens = options.overlapTokens || 200; // More overlap for better context
    this.temperature = options.temperature || 0.3;
    this.requestDelay = options.requestDelay || 2000; // Slightly longer delay

    // Enhanced chunking parameters
    this.minQuestionsPerChunk = 2;
    this.maxQuestionsPerChunk = 5;
    this.optimalChunkSize = 8000; // Characters - optimal size for content diversity
    this.minChunkSize = 1000; // Minimum meaningful chunk size
    this.targetChunkOverlap = 0.15; // 15% overlap between adjacent chunks
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
  }  /**
   * Calculate optimal chunking strategy that doesn't interfere with question count
   * Enhanced for large question sets (15-20 questions)
   */
  calculateOptimalChunking(text, targetQuestions) {
    const totalChars = text.length;
    const totalTokens = this.estimateTokens(text);

    console.log(`📊 Enhanced Quiz Chunking Analysis:`);
    console.log(`   Text length: ${totalChars.toLocaleString()} chars`);
    console.log(`   Estimated tokens: ${totalTokens.toLocaleString()}`);
    console.log(`   Target questions: ${targetQuestions}`);

    // For large question sets (15+), prefer multiple chunks for better content coverage
    if (targetQuestions >= 15 && totalChars > 4000) {
      console.log(`   Large question set detected (${targetQuestions}), using multi-chunk strategy`);
      
      // Calculate optimal chunk count for large sets
      const idealChunkCount = Math.min(Math.ceil(targetQuestions / 5), 4); // 3-5 questions per chunk, max 4 chunks
      const baseChunkSize = Math.floor(totalChars / idealChunkCount);
      const overlapSize = Math.floor(baseChunkSize * 0.2); // 20% overlap for large sets
      
      console.log(`   Multi-chunk strategy: ${idealChunkCount} chunks for better coverage`);
      
      return {
        chunkCount: idealChunkCount,
        chunkSize: baseChunkSize,
        overlapSize: overlapSize,
        strategy: 'large-set-multi-chunk',
      };
    }

    // For smaller question sets or content, use original logic
    // For small content, use single chunk
    if (totalChars <= this.optimalChunkSize) {
      console.log(`   Using single chunk (content fits optimally)`);
      return {
        chunkCount: 1,
        chunkSize: totalChars,
        overlapSize: 0,
        strategy: 'single',
      };
    }

    // Calculate optimal chunk count based on content size and diversity needs
    const idealChunkCount = Math.ceil(totalChars / this.optimalChunkSize);
    const maxChunksForQuestions = Math.min(targetQuestions, 8); // Cap at 8 chunks max
    const finalChunkCount = Math.min(idealChunkCount, maxChunksForQuestions);

    // Calculate chunk size with overlap
    const baseChunkSize = Math.floor(totalChars / finalChunkCount);
    const overlapSize = Math.floor(baseChunkSize * this.targetChunkOverlap);
    const adjustedChunkSize = Math.max(baseChunkSize, this.minChunkSize);

    console.log(`   Optimal chunk count: ${finalChunkCount}`);
    console.log(`   Chunk size: ~${adjustedChunkSize.toLocaleString()} chars (+ ${overlapSize} overlap)`);
    console.log(`   Strategy: content-focused chunking`);

    return {
      chunkCount: finalChunkCount,
      chunkSize: adjustedChunkSize,
      overlapSize: overlapSize,
      strategy: 'content-focused',
    };
  }/**
   * Create optimized chunks for content diversity
   */
  createOptimizedChunks(text, strategy) {
    const chunks = [];
    const { chunkCount, chunkSize, overlapSize } = strategy;
    const totalLength = text.length;

    // Handle single chunk case
    if (chunkCount === 1 || strategy.strategy === 'single') {
      chunks.push({
        id: 1,
        text: text.trim(),
        start: 0,
        end: totalLength,
        tokens: this.estimateTokens(text),
      });
      console.log(`📦 Created 1 chunk for processing (single chunk mode)`);
      return chunks;
    }

    // Create overlapping chunks for maximum content coverage
    for (let i = 0; i < chunkCount; i++) {
      // Calculate positions for even distribution with overlap
      const start = i === 0 ? 0 : Math.floor(i * (totalLength - overlapSize) / (chunkCount - 1));
      const end = i === chunkCount - 1 ? totalLength : Math.min(start + chunkSize + overlapSize, totalLength);

      // Adjust to word boundaries for better context
      let adjustedStart = start;
      let adjustedEnd = end;

      if (start > 0) {
        adjustedStart = this.findWordBoundary(text, start, true);
      }

      if (end < totalLength) {
        adjustedEnd = this.findWordBoundary(text, end, false);
      }

      const chunkText = text.slice(adjustedStart, adjustedEnd).trim();

      if (chunkText.length >= this.minChunkSize || i === 0) {
        // Always include first chunk even if small
        chunks.push({
          id: i + 1,
          text: chunkText,
          start: adjustedStart,
          end: adjustedEnd,
          tokens: this.estimateTokens(chunkText),
        });
      }
    }

    console.log(`📦 Created ${chunks.length} optimized chunks for processing`);
    chunks.forEach((chunk, idx) => {
      console.log(`   Chunk ${idx + 1}: ${chunk.text.length} chars (${chunk.tokens} tokens)`);
    });

    return chunks;
  }

  /**
   * Find word boundary near position
   */
  findWordBoundary(text, position, searchBackward = true) {
    const searchRange = 50;
    let start = Math.max(0, position - searchRange);
    let end = Math.min(text.length, position + searchRange);
    let bestPosition = position;

    if (searchBackward) {
      for (let i = position; i >= start; i--) {
        if (/\s/.test(text[i])) {
          bestPosition = i + 1;
          break;
        }
      }
    } else {
      for (let i = position; i < end; i++) {
        if (/\s/.test(text[i])) {
          bestPosition = i;
          break;
        }
      }
    }

    return bestPosition;
  }  /**
   * Generate quiz content using Fanar API (Step 1: Content Generation)
   * Enhanced for large question sets
   */
  async generateRawQuizContent(chunkText, questionCount, chunkIndex, params) {
    const { difficulty, questionType } = params;

    // For large question counts, be more explicit about quantity
    const systemPrompt = `You are an expert educator creating quiz questions. Generate EXACTLY ${questionCount} ${difficulty} difficulty quiz questions about the provided content.

CRITICAL FOR LARGE SETS: If generating ${questionCount} questions, ensure you create enough diverse content to support all ${questionCount} questions.

Focus on creating meaningful questions that test understanding. Include:
- Clear question text
- Multiple plausible answer choices (4 options for multiple choice, true/false for boolean)
- The correct answer
- A brief explanation

Question types:
- multiple-choice: One correct answer from 4 options
- multi-select: Multiple correct answers from 4 options  
- true-false: True or false questions
- mixed: Vary between types

Generate EXACTLY ${questionCount} questions. Format your response as natural text describing each question, its options, correct answer, and explanation. Cover different aspects of the content to ensure variety. Don't worry about strict JSON format - focus on quality content with sufficient detail for ${questionCount} distinct questions.`;

    const userPrompt = `Create EXACTLY ${questionCount} ${questionType} quiz questions based on this content. Ensure you generate ${questionCount} complete, distinct questions covering different aspects of the material:\n\n${chunkText}`;

    try {
      console.log(`🔄 Generating raw content for ${questionCount} questions (chunk ${chunkIndex + 1})...`);

      // Use higher token limits for large question counts
      const maxTokens = questionCount > 10 ? 
        Math.min(this.maxCompletionTokens * 2, 3000) : 
        this.maxCompletionTokens;

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: this.temperature,
          max_tokens: maxTokens,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 120000, // Increased timeout for large sets
        }
      );

      const rawContent = response.data.choices[0].message.content;
      console.log(`✅ Generated raw content for chunk ${chunkIndex + 1} (${rawContent.length} chars, target: ${questionCount} questions)`);

      // Validate that we have substantial content for the requested questions
      if (rawContent.length < questionCount * 100) {
        console.log(`⚠️ Raw content may be insufficient for ${questionCount} questions (${rawContent.length} chars)`);
      }

      return {
        rawContent,
        chunkIndex,
        questionCount,
        questionType,
        difficulty
      };

    } catch (error) {
      console.error(`❌ Error generating raw content for chunk ${chunkIndex + 1}:`, error.message);
      
      // Enhanced fallback content for large question sets
      const fallbackQuestions = [];
      for (let i = 1; i <= questionCount; i++) {
        fallbackQuestions.push(`Question ${i}: Based on the content, which statement about the topic is most accurate?
Options: A) The content provides comprehensive information, B) The content needs additional interpretation, C) The content covers basic concepts, D) The content requires expert knowledge
Correct Answer: A
Explanation: This is a fallback question ${i} due to generation error.`);
      }
      
      return {
        rawContent: fallbackQuestions.join('\n\n'),
        chunkIndex,
        questionCount,
        questionType,
        difficulty
      };
    }
  }
  /**
   * Enhanced quiz generation with Fanar + OpenAI two-step process
   */
  async generateQuestionsWithTranslation(content, numQuestions, params, options = {}) {
    const { translateToArabic = false } = options;
    
    const startTime = Date.now();
    console.log(`🎯 Starting enhanced quiz generation (Fanar + OpenAI)...`);
    console.log(`📊 Content: ${content.length} characters, Target: ${numQuestions} questions`);
    
    if (translateToArabic) {
      console.log(`🌐 Arabic translation requested`);
    }

    try {
      // Step 1: Calculate optimal chunking strategy
      const strategy = this.calculateOptimalChunking(content, numQuestions);
      const chunks = this.createOptimizedChunks(content, strategy);

      if (chunks.length === 0) {
        throw new Error("No viable chunks created from content");
      }

      // Step 2: Generate raw content from all chunks using Fanar API
      console.log(`🔄 Step 1: Generating raw content with Fanar API...`);
      const rawContentPromises = chunks.map((chunk, index) => 
        this.generateRawQuizContent(
          chunk.text,
          Math.ceil(numQuestions / chunks.length), // Distribute questions across chunks
          index,
          params
        )
      );

      const rawContentResults = await Promise.allSettled(rawContentPromises);
      const successfulResults = rawContentResults
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

      if (successfulResults.length === 0) {
        throw new Error("Failed to generate content from any chunks");
      }      // Step 3: Combine and structure content using OpenAI schema validation
      console.log(`🔧 Step 2: Structuring content with OpenAI schema validation...`);
      const combinedRawContent = successfulResults
        .map(result => result.rawContent)
        .join('\n\n---\n\n');

      const structuredQuestions = await this.structureQuizContent({
        rawContent: combinedRawContent,
        questionType: params.questionType,
        difficulty: params.difficulty
      }, numQuestions);

      console.log(`📊 OpenAI structured ${structuredQuestions.length} questions (requested: ${numQuestions})`);

      // Step 4: Trim to exact count and ensure quality
      const finalQuestions = structuredQuestions.slice(0, numQuestions);

      // Ensure we have the requested number of questions
      if (finalQuestions.length < numQuestions) {
        const missing = numQuestions - finalQuestions.length;
        console.log(`⚠️ Missing ${missing} questions, generating fallback questions...`);
        
        const additionalQuestions = this.createFallbackQuestions(
          missing,
          params.questionType,
          params.difficulty
        );
        finalQuestions.push(...additionalQuestions);
        
        console.log(`✅ Added ${additionalQuestions.length} fallback questions to reach target of ${numQuestions}`);
      }// Step 5: Translate if requested
      if (translateToArabic && finalQuestions.length > 0) {
        console.log("🌐 Step 3: Translating questions to Arabic...");
        try {
          const translationService = new TranslationService(this.apiKey, {
            requestDelay: 1000 // Increase base delay for rate limiting
          });
          
          for (let i = 0; i < finalQuestions.length; i++) {
            const question = finalQuestions[i];
            console.log(`🔄 Translating question ${i + 1}/${finalQuestions.length}...`);
            
            // Translate question text with delay
            const translatedText = await translationService.translateText(question.text);
            await new Promise(resolve => setTimeout(resolve, 800)); // Delay after question text
            
            // Translate options with delays between each
            const translatedOptions = [];
            for (let j = 0; j < question.options.length; j++) {
              const option = question.options[j];
              const translatedOptionText = await translationService.translateText(option.text);
              translatedOptions.push({
                ...option,
                text: translatedOptionText
              });
              
              // Add delay between option translations (except after last option)
              if (j < question.options.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 600));
              }
            }
            
            // Delay before explanation translation
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Translate explanation
            const translatedExplanation = await translationService.translateText(question.explanation);
            
            // Update question with translations
            finalQuestions[i] = {
              ...question,
              text: translatedText,
              options: translatedOptions,
              explanation: translatedExplanation,
            };
            
            // Add longer delay between questions to prevent rate limiting
            if (i < finalQuestions.length - 1) {
              console.log(`⏱️ Waiting before next question (${2}s)...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
          
          console.log(`✅ Successfully translated ${finalQuestions.length} questions to Arabic`);
        } catch (translationError) {
          console.error("❌ Translation failed:", translationError);
          console.log("📝 Proceeding with English questions...");
        }
      }

      const duration = Date.now() - startTime;
      console.log(`🎉 Enhanced quiz generation complete: ${finalQuestions.length}/${numQuestions} questions in ${Math.round(duration / 1000)}s`);

      return {
        questions: finalQuestions,
        metadata: {
          chunksProcessed: chunks.length,
          totalTime: duration,
          averageTimePerQuestion: Math.round(duration / finalQuestions.length),
          contentLength: content.length,
          translationEnabled: translateToArabic,
          generationMethod: 'fanar-openai-hybrid',
          chunkingStrategy: strategy.strategy
        }
      };

    } catch (error) {
      console.error("❌ Enhanced quiz generation failed:", error.message);
      
      // Ultimate fallback - create basic questions
      console.log("🚨 Creating emergency fallback questions...");
      const fallbackQuestions = this.createFallbackQuestions(numQuestions, params.questionType, params.difficulty);
      
      return {
        questions: fallbackQuestions,
        metadata: {
          chunksProcessed: 0,
          totalTime: Date.now() - startTime,
          averageTimePerQuestion: 0,
          contentLength: content.length,
          translationEnabled: translateToArabic,
          generationMethod: 'fallback',
          error: error.message
        }
      };
    }
  }

  /**
   * Structure raw quiz content using OpenAI with strict schema (Step 2: Schema Validation)
   */
  async structureQuizContent(rawContentData, targetQuestions) {
    const { rawContent, questionType, difficulty } = rawContentData;    // Define strict JSON schema for quiz questions
    const QUIZ_SCHEMA = {
      name: "quiz_questions_schema",
      strict: true,
      schema: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                type: { 
                  type: "string",
                  enum: ["multiple-choice", "multi-select", "true-false"]
                },
                options: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      text: { type: "string" }
                    },
                    required: ["id", "text"],
                    additionalProperties: false
                  }
                },                correctAnswer: { type: "string" }, // Always string - we'll handle multi-select in validation
                explanation: { type: "string" }
              },
              required: ["text", "type", "options", "correctAnswer", "explanation"],
              additionalProperties: false
            }
          }
        },
        required: ["questions"],
        additionalProperties: false
      }
    };    const systemPrompt = `You are a quiz content formatter. Convert the provided raw quiz content into a properly structured JSON format.

CRITICAL REQUIREMENT: Generate EXACTLY ${targetQuestions} questions. No more, no less.

SPECIAL HANDLING FOR LARGE SETS (${targetQuestions} questions):
- Keep explanations brief (1 sentence maximum) for token efficiency
- Ensure all ${targetQuestions} questions are complete and valid
- Use concise but clear language
- Focus on JSON structure completeness over verbose explanations

REQUIREMENTS:
1. Extract EXACTLY ${targetQuestions} questions from the content (this is mandatory)
2. If the content has more questions, select the best ${targetQuestions} 
3. If the content has fewer questions, create additional questions based on the content themes
4. Ensure each question has proper structure with text, type, options, correctAnswer, and explanation
5. For multiple-choice questions: use option ids "a", "b", "c", "d"
6. For true-false questions: use option ids "true", "false"
7. For single-answer questions (multiple-choice, true-false): use correctAnswer as a single string
8. For multi-select questions: use correctAnswer as a comma-separated string like "a,c"
9. Make sure all options have both "id" and "text" fields
10. Keep explanations brief and focused (especially for large question sets)

IMPORTANT:
- Always use correctAnswer as a string field
- For multi-select: use comma-separated format like "a,c"
- For single answer: use single option id like "a"
- MUST generate exactly ${targetQuestions} questions in the JSON array
- For ${targetQuestions} questions, prioritize completeness over detail

Convert the content exactly as provided, maintaining the original intent and accuracy. If you need to create additional questions to reach ${targetQuestions}, base them on the themes and concepts in the provided content.`;let userPrompt = `Convert this raw quiz content into the required JSON format with EXACTLY ${targetQuestions} questions.

Raw content:
${rawContent}

Requirements:
- Type: "${questionType}" questions
- Difficulty: "${difficulty}"
- Count: EXACTLY ${targetQuestions} questions (mandatory)

If the raw content doesn't have enough questions, create additional questions based on the content themes to reach exactly ${targetQuestions} questions.`;try {
      console.log(`🔧 Structuring quiz content with OpenAI schema validation...`);      let structuredContent, parsedQuestions;
      let attempts = 0;
      const maxAttempts = 3; // Increased for larger question sets// Retry logic to ensure we get the exact number of questions
      while (attempts < maxAttempts) {
        attempts++;
          // Use progressively higher token limits for larger question counts
        const baseTokens = targetQuestions >= 15 ? 
          Math.max(5000, targetQuestions * 300) :  // Higher base for large sets
          Math.max(3000, targetQuestions * 200);
        const tokenLimit = baseTokens + (attempts - 1) * 1500; // Larger increments per retry
        
        console.log(`🔄 OpenAI attempt ${attempts}/${maxAttempts} with ${tokenLimit} token limit...`);
        
        const response = await this.openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: {
            type: "json_schema",
            json_schema: QUIZ_SCHEMA,
          },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.1, // Low temperature for consistent formatting
          max_tokens: tokenLimit,
        });structuredContent = response.choices[0].message.content;
        
        // Check if response was truncated (common cause of JSON parsing errors)
        if (response.choices[0].finish_reason === 'length') {
          console.log(`⚠️ OpenAI response was truncated due to token limit on attempt ${attempts}`);
          if (attempts < maxAttempts) {
            console.log(`🔄 Retrying with higher token limit...`);
            continue; // Skip to next attempt with higher token limit
          }
        }
        
        try {
          parsedQuestions = JSON.parse(structuredContent);
        } catch (parseError) {
          console.error(`❌ JSON parsing failed on attempt ${attempts}:`, parseError.message);
          
          // Try to fix common JSON issues if this is the last attempt
          if (attempts === maxAttempts) {
            console.log(`🔧 Attempting to fix truncated JSON...`);
            try {
              // Try to close incomplete JSON structures
              let fixedJson = structuredContent;
              
              // Count open and close braces to identify truncation
              const openBraces = (fixedJson.match(/\{/g) || []).length;
              const closeBraces = (fixedJson.match(/\}/g) || []).length;
              const openBrackets = (fixedJson.match(/\[/g) || []).length;
              const closeBrackets = (fixedJson.match(/\]/g) || []).length;
              
              // Add missing closing brackets/braces
              for (let i = 0; i < (openBrackets - closeBrackets); i++) {
                fixedJson += ']';
              }
              for (let i = 0; i < (openBraces - closeBraces); i++) {
                fixedJson += '}';
              }
              
              // Try to remove incomplete trailing content
              const lastCompleteQuote = fixedJson.lastIndexOf('"');
              const lastCompleteComma = fixedJson.lastIndexOf(',');
              const lastCompleteBrace = fixedJson.lastIndexOf('}');
              
              if (lastCompleteQuote > lastCompleteBrace && lastCompleteComma < lastCompleteQuote) {
                // Truncate to last complete field
                fixedJson = fixedJson.substring(0, lastCompleteQuote + 1) + '}]}';
              }
              
              parsedQuestions = JSON.parse(fixedJson);
              console.log(`✅ Successfully fixed truncated JSON`);
            } catch (fixError) {
              console.error(`❌ Could not fix JSON:`, fixError.message);
              // Fall back to using empty questions array for this attempt
              parsedQuestions = { questions: [] };
            }
          } else {
            // For non-final attempts, just skip to retry
            parsedQuestions = { questions: [] };
          }
        }
        
        const questionCount = parsedQuestions.questions?.length || 0;
        console.log(`✅ OpenAI attempt ${attempts}: Generated ${questionCount} questions (target: ${targetQuestions})`);
        
        // If we got the right number of questions, break out of retry loop
        if (questionCount >= targetQuestions) {
          break;
        }
        
        // If we got fewer questions and have retries left, try again with modified prompt
        if (attempts < maxAttempts) {
          console.log(`⚠️ Got ${questionCount} questions, retrying with stronger emphasis...`);
          userPrompt = `CRITICAL: You MUST generate EXACTLY ${targetQuestions} questions. The previous attempt only generated ${questionCount}.

${userPrompt}

REMINDER: Generate EXACTLY ${targetQuestions} questions - this is mandatory for the system to work correctly.`;
        }
      }      const finalQuestionCount = parsedQuestions.questions?.length || 0;
      console.log(`✅ Successfully structured ${finalQuestionCount} questions with OpenAI`);

      // Additional validation and cleanup
      let validatedQuestions = this.validateAndCleanQuestions(parsedQuestions.questions || [], questionType);

      // For large question sets, if we're still short, add smart fallback questions
      if (validatedQuestions.length < targetQuestions && targetQuestions >= 15) {
        const missing = targetQuestions - validatedQuestions.length;
        console.log(`⚠️ Large set still missing ${missing} questions after OpenAI attempts, generating smart fallbacks...`);
        
        // Generate more sophisticated fallback questions based on existing content
        const smartFallbacks = this.createSmartFallbackQuestions(
          missing, 
          questionType, 
          difficulty, 
          rawContent
        );
        
        validatedQuestions.push(...smartFallbacks);
        console.log(`✅ Added ${smartFallbacks.length} smart fallback questions for large set`);
      }

      return validatedQuestions;

    } catch (error) {
      console.error(`❌ Error structuring content with OpenAI:`, error.message);
      
      // Return basic fallback questions if OpenAI fails
      return this.createFallbackQuestions(targetQuestions, questionType, difficulty);
    }
  }
  /**
   * Validate and clean questions from OpenAI response
   */
  validateAndCleanQuestions(questions, expectedType) {
    return questions.map(q => {
      // Ensure correct question type
      const type = q.type || expectedType;
      
      // Validate options structure
      let options = q.options || [];
      if (type === "true-false") {
        options = [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ];
      } else if (options.length < 2) {
        options = [
          { id: "a", text: "Option A" },
          { id: "b", text: "Option B" },
          { id: "c", text: "Option C" },
          { id: "d", text: "Option D" }
        ];
      }      // Handle correctAnswer based on question type and schema format
      let correctAnswer = q.correctAnswer;
      
      if (type === "multi-select") {
        // For multi-select, parse comma-separated string or handle array format
        if (typeof correctAnswer === "string" && correctAnswer.includes(",")) {
          // Parse comma-separated string: "a,c" → ["a", "c"]
          correctAnswer = correctAnswer.split(",").map(id => id.trim());
        } else if (Array.isArray(correctAnswer)) {
          // Already an array, keep as is
          correctAnswer = correctAnswer;
        } else if (typeof correctAnswer === "string") {
          // Single answer as array
          correctAnswer = [correctAnswer];
        } else {
          // Fallback
          correctAnswer = [options[0]?.id];
        }
      } else {
        // For single-answer questions, ensure it's a string
        if (Array.isArray(correctAnswer)) {
          correctAnswer = correctAnswer[0] || options[0]?.id;
        } else if (!correctAnswer) {
          correctAnswer = options[0]?.id;
        }
      }

      return {
        text: q.text || "Question text missing",
        type: type,
        options: options,
        correctAnswer: correctAnswer,
        explanation: q.explanation || "No explanation provided."
      };
    });
  }
  /**
   * Create smart fallback questions based on content themes (for large question sets)
   */
  createSmartFallbackQuestions(count, questionType, difficulty, rawContent) {
    const questions = [];
    
    // Extract key terms and concepts from raw content for smarter fallbacks
    const contentWords = rawContent.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const uniqueWords = [...new Set(contentWords)].slice(0, 20); // Top 20 unique words
    
    // Common AI/ML/Tech concepts for fallback questions
    const fallbackConcepts = [
      "machine learning algorithms", "artificial intelligence systems", "data analysis techniques",
      "neural network architectures", "deep learning models", "natural language processing",
      "computer vision applications", "supervised learning methods", "unsupervised learning",
      "reinforcement learning", "pattern recognition", "feature extraction",
      "model training", "algorithm optimization", "data preprocessing",
      "prediction accuracy", "classification tasks", "regression analysis",
      "clustering techniques", "dimensionality reduction"
    ];
    
    for (let i = 0; i < count; i++) {
      const questionNum = i + 1;
      const concept = fallbackConcepts[i % fallbackConcepts.length];
      const keyWord = uniqueWords[i % uniqueWords.length] || "technology";
      
      if (questionType === "true-false") {
        questions.push({
          text: `Statement ${questionNum}: The concept of ${concept} is an important aspect of modern ${keyWord} development.`,
          type: "true-false",
          options: [
            { id: "true", text: "True" },
            { id: "false", text: "False" }
          ],
          correctAnswer: "true",
          explanation: `This statement about ${concept} reflects key principles in the field.`
        });
      } else {
        questions.push({
          text: `Question ${questionNum}: Which of the following best describes the role of ${concept} in modern ${keyWord}?`,
          type: questionType,
          options: [
            { id: "a", text: `Essential component for ${keyWord} advancement` },
            { id: "b", text: `Optional enhancement for ${keyWord} systems` },
            { id: "c", text: `Legacy approach in ${keyWord} development` },
            { id: "d", text: `Theoretical concept without practical application` }
          ],
          correctAnswer: questionType === "multi-select" ? ["a"] : "a",
          explanation: `${concept} plays a crucial role in advancing ${keyWord} capabilities.`
        });
      }
    }
    
    return questions;
  }

  /**
   * Create fallback questions when both Fanar and OpenAI fail
   */
  createFallbackQuestions(count, questionType, difficulty) {
    const questions = [];
    
    for (let i = 0; i < count; i++) {
      const questionNum = i + 1;
      
      if (questionType === "true-false") {
        questions.push({
          text: `Statement ${questionNum}: This content provides valuable information for learning.`,
          type: "true-false",
          options: [
            { id: "true", text: "True" },
            { id: "false", text: "False" }
          ],
          correctAnswer: "true",
          explanation: `This is a fallback true/false question (${difficulty} difficulty).`
        });
      } else {
        questions.push({
          text: `Question ${questionNum}: Which of the following best describes the content?`,
          type: questionType,
          options: [
            { id: "a", text: "Educational and informative" },
            { id: "b", text: "Requires additional context" },
            { id: "c", text: "Incomplete information" },
            { id: "d", text: "Not clearly structured" }
          ],
          correctAnswer: questionType === "multi-select" ? ["a"] : "a",
          explanation: `This is a fallback question due to generation issues (${difficulty} difficulty).`
        });
      }
    }
    
    return questions;
  }
}

export default QuizGenerator;
