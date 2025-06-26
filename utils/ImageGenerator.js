import axios from 'axios';
import OpenAI from 'openai';
import { uploadImageToBlob, generateImageFilename } from './blobStorage.js';

/**
 * Enhanced Image Generator for Educational Flashcards
 * Uses OpenAI for smart prompt generation + Fanar for image creation
 * Stores ONLY base64 data in database (no file writing)
 */
class ImageGenerator {
    constructor(apiKey, options = {}) {
        this.fanarApiKey = apiKey;
        this.openaiApiKey = process.env.OPENAI_API_KEY;
        this.fanarApiUrl = options.apiUrl || 'https://api.fanar.qa/v1/images/generations';
        this.model = options.model || 'Fanar-ImageGen-1';
        this.requestDelay = options.requestDelay || 500;
        
        // Initialize OpenAI client
        if (this.openaiApiKey) {
            this.openai = new OpenAI({
                apiKey: this.openaiApiKey,
            });
        }
    }

    /**
     * Ensure output directory exists - REMOVED (no file writing)
     */
    ensureOutputDirectory() {
        // No-op: We don't write files anymore
        console.log('📦 Image storage mode: Database-only (no file writing)');
    }    /**
     * Generate an educational image for a flashcard answer using OpenAI + Fanar
     */
    async generateFlashcardImage(flashcardFront, flashcardBack, flashcardId, deckId = null, cardIndex = 0) {
        try {
            // Validate input parameters
            if (!flashcardFront && !flashcardBack) {
                throw new Error('Both flashcardFront and flashcardBack are undefined');
            }
            
            const front = flashcardFront || 'Question not available';
            const back = flashcardBack || 'Answer not available';
            
            console.log(`🔄 Step 1: Evaluating answer suitability for image generation...`);
            console.log(`Processing: "${front.toString().substring(0, 50)}..."`);
            
            // Step 1: Use OpenAI to determine if image is suitable and create prompt
            const promptResult = await this.generateImagePromptWithOpenAI(back);
            
            if (!promptResult || !promptResult.has_response) {
                console.log(`ℹ️ Answer not suitable for image generation: ${promptResult?.response || 'Evaluation failed'}`);
                return {
                    success: false,
                    reason: promptResult?.response || 'Not suitable for image generation',
                    imageUrl: null
                };
            }
            
            console.log(`✅ Generated image prompt: ${promptResult.response.substring(0, 100)}...`);
            
            // Step 2: Generate image with Fanar using enhanced prompt
            console.log(`🔄 Step 2: Generating image with Fanar...`);
            const imageResult = await this.generateImageWithFanar(promptResult.response, flashcardId, deckId, cardIndex);
            
            if (imageResult.success) {
                console.log(`✅ Image generated successfully for flashcard: ${flashcardId}`);
                return imageResult;
            } else {
                throw new Error(imageResult.error || 'Image generation failed');
            }

        } catch (error) {
            console.error(`❌ Image generation failed for flashcard ${flashcardId}:`, error.message);
            
            return {
                success: false,
                error: error.message,
                imageUrl: null
            };
        }
    }

    /**
     * Generate image prompt using OpenAI (from testImageCreation.js logic)
     */
    async generateImagePromptWithOpenAI(answer) {
        if (!this.openai) {
            console.log('⚠️ OpenAI not configured, using fallback prompt generation');
            return {
                has_response: true,
                response: `Create a high-quality, safe, educational illustration that visually represents: "${answer}". Professional style, no text, simple background.`
            };
        }

        try {
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert at evaluating educational content and converting suitable answers into detailed visual image prompts. Your task is to first determine if a flashcard answer can benefit from a visual illustration, then create an appropriate image prompt if suitable."
                    },
                    {
                        role: "user",
                        content: `Evaluate this flashcard answer and determine if it would benefit from a visual illustration:

"${answer}"

First, decide if this answer is suitable for image creation by considering:
- Does it describe concrete concepts, objects, or processes?
- Would a visual aid help students understand better?
- Is it complex enough to warrant an illustration?
- Avoid creating images for simple definitions, abstract concepts without visual elements, or very short answers

If suitable for image creation, provide a detailed visual image prompt. If not suitable, explain why briefly.

Requirements for image prompts (when applicable):
- Describe exactly what should be shown in the image
- Focus on visual elements that represent the key concepts
- Use clear, specific descriptions of objects, people, or symbols
- Mention colors, style, and composition
- Keep it educational and professional
- ABSOLUTELY CRITICAL: NO TEXT, NO LETTERS, NO NUMBERS, NO WORDS, NO LABELS, NO CAPTIONS, NO WRITING SYSTEMS of any kind in the image
- Do not describe any text-based elements like signs, labels, titles, or readable content
- Pure visual representation only - completely text-free illustration
- Avoid mentioning anything that typically contains text (like books, signs, screens with text, etc.)
- Make it suitable for a flashcard visual aid`
                    }
                ],
                temperature: 0,
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: "image_generation_response",
                        schema: {
                            type: "object",
                            properties: {
                                has_response: {
                                    type: "boolean",
                                    description: "Indicates whether this answer is suitable for image generation and an image prompt should be created."
                                },
                                response: {
                                    type: "string",
                                    description: "If has_response is true, contains the detailed image prompt. If false, contains a brief explanation of why the answer is not suitable for image generation.",
                                    minLength: 1
                                }
                            },
                            required: ["has_response", "response"],
                            additionalProperties: false
                        },
                        strict: true
                    }
                }
            });

            const result = JSON.parse(completion.choices[0].message.content);
            return result;
            
        } catch (error) {
            console.error('OpenAI API error:', error);
            return { has_response: false, response: 'OpenAI evaluation failed' };
        }
    }    /**
     * Generate image with Fanar API and upload to Vercel Blob storage
     */
    async generateImageWithFanar(imagePrompt, flashcardId, deckId = null, cardIndex = 0) {
        try {
            // Enhanced prompt with strong anti-text instructions
            const enhancedPrompt = `${imagePrompt}. Style: clean illustration, educational diagram style, professional visual aid. 

NEGATIVE PROMPTS (what NOT to include): text, words, letters, numbers, captions, labels, titles, signs, writing, typography, alphabet, readable content, linguistic elements, books with text, computer screens with text, newspapers, documents with text, posters with writing.

CRITICAL: Pure visual representation only - absolutely no text or written elements of any kind.`;

            const response = await axios.post(this.fanarApiUrl, {
                model: this.model,
                prompt: enhancedPrompt
            }, {
                headers: {
                    'Authorization': `Bearer ${this.fanarApiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data?.data?.[0]?.b64_json) {
                const base64Image = response.data.data[0].b64_json;
                
                console.log(`🔄 Step 3: Uploading image to Vercel Blob storage...`);
                
                // Generate unique filename and upload to blob storage
                const filename = generateImageFilename(deckId || flashcardId, cardIndex);
                const imageUrl = await uploadImageToBlob(base64Image, filename);
                
                console.log(`✅ Image uploaded to blob storage: ${imageUrl}`);
                
                return {
                    success: true,
                    imageUrl: imageUrl,       // Blob storage URL
                    localPath: null          // No local file
                };
            } else {
                throw new Error('No image data received from Fanar API');
            }

        } catch (error) {
            console.error('Fanar image generation error:', error);
            return {
                success: false,
                error: error.message,
                imageUrl: null
            };
        }
    }    /**
     * Generate images for multiple flashcards with smart filtering
     */    async generateFlashcardImages(flashcards, deckId = null, generateForAll = false) {
        const results = [];
        
        if (!flashcards || !Array.isArray(flashcards) || flashcards.length === 0) {
            console.warn('⚠️ No flashcards provided for image generation');
            return results;
        }
        
        console.log(`🎨 Starting image generation for ${flashcards.length} flashcards...`);
        
        for (let i = 0; i < flashcards.length; i++) {
            const flashcard = flashcards[i];
            
            // Validate flashcard structure
            if (!flashcard) {
                console.warn(`⚠️ Flashcard at index ${i} is undefined, skipping...`);
                results.push({
                    flashcard: { front: 'Invalid', back: 'Invalid' },
                    imageResult: { success: false, error: 'Flashcard is undefined' }
                });
                continue;
            }
            
            const front = flashcard.front || flashcard.question || 'Question not available';
            const back = flashcard.back || flashcard.answer || 'Answer not available';
            const cardId = flashcard.id || `temp_${i + 1}`;
            
            console.log(`🔄 Processing flashcard ${i + 1}/${flashcards.length}: "${front.toString().substring(0, 30)}..."`);
            
            const imageResult = await this.generateFlashcardImage(
                front,
                back,
                cardId,
                deckId,
                i
            );
            
            results.push({
                flashcard: { front, back, id: cardId },
                imageResult
            });
            
            // Rate limiting between requests
            if (i < flashcards.length - 1) {
                console.log(`⏳ Waiting ${this.requestDelay}ms before next image generation...`);
                await new Promise(resolve => setTimeout(resolve, this.requestDelay));
            }
        }
        
        const successCount = results.filter(r => r.imageResult.success).length;
        console.log(`🎨 Image generation complete: ${successCount}/${flashcards.length} images generated`);
        
        return results;
    }

    /**
     * Create an educational prompt for image generation
     */
    createEducationalPrompt(question, answer) {
        // Clean and prepare the content
        const cleanAnswer = answer.replace(/[^\w\s\-\.,]/g, '').substring(0, 300);
        
        return `Create a high-quality, safe, educational illustration that visually represents the following concept: "${cleanAnswer}". 

Requirements:
- Educational and professional style suitable for flashcards
- Clear, simple, and visually appealing design
- Metaphorical, symbolic, or directly related to the key concept
- Clean background that emphasizes the main idea
- No text, logos, or brand names in the image
- Safe, appropriate content for educational use
- Modern, clean illustration style
- Focus on the core concept being explained

The image should help a student understand and remember: "${question}"`;
    }

    /**
     * Determine if a flashcard is suitable for image generation
     */
    shouldGenerateImage(flashcard) {
        const back = flashcard.back.toLowerCase();
        const front = flashcard.front.toLowerCase();
        
        // Check for visual concepts that would benefit from images
        const visualKeywords = [
            'structure', 'diagram', 'process', 'system', 'anatomy', 'biology',
            'chemistry', 'physics', 'architecture', 'engineering', 'design',
            'interface', 'model', 'illustration', 'example', 'mechanism',
            'workflow', 'algorithm', 'method', 'procedure', 'technique',
            'concept', 'theory', 'principle', 'framework', 'pattern',
            'geography', 'map', 'landscape', 'environment', 'ecosystem',
            'medical', 'scientific', 'technological', 'historical', 'artistic'
        ];
        
        // Check for non-visual content that might not need images
        const nonVisualKeywords = [
            'definition only', 'text only', 'number', 'date', 'year',
            'formula only', 'equation only', 'name only', 'abbreviation'
        ];
        
        const hasVisualKeywords = visualKeywords.some(keyword => 
            back.includes(keyword) || front.includes(keyword)
        );
        
        const hasNonVisualKeywords = nonVisualKeywords.some(keyword => 
            back.includes(keyword) || front.includes(keyword)
        );
        
        // Prefer longer answers that can be visualized
        const hasSubstantialContent = back.length > 50;
        
        return (hasVisualKeywords || hasSubstantialContent) && !hasNonVisualKeywords;
    }}

export default ImageGenerator;
