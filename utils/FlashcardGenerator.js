import axios from 'axios';

/**
 * Streamlined Flashcard Generator for integration
 * No file operations, returns variables directly
 */
class FlashcardGenerator {
    constructor(apiKey, options = {}) {
        this.apiKey = apiKey;
        this.apiUrl = options.apiUrl || 'https://api.fanar.qa/v1/chat/completions';
        this.model = options.model || 'Fanar-S-1-7B';
        
        // Calibrated settings based on your API data
        this.charsPerToken = options.charsPerToken || 4.24;
        this.safeTokenLimit = options.safeTokenLimit || 4000;
        this.flashcardsPerChunk = options.flashcardsPerChunk || 4;
        this.overlapTokens = options.overlapTokens || 150;
        this.temperature = options.temperature || 0.3;
        this.requestDelay = options.requestDelay || 1500;
    }

    /**
     * Calculate tokens from text length
     */
    estimateTokens(text) {
        return Math.round(text.length / this.charsPerToken);
    }

    /**
     * Calculate safe character limit
     */
    getSafeCharLimit() {
        return Math.floor(this.safeTokenLimit * this.charsPerToken * 0.9);
    }

    /**
     * Split text into optimal chunks
     */
    createChunks(text) {
        const chunks = [];
        let currentPosition = 0;
        const safeCharLimit = this.getSafeCharLimit();
        const overlapChars = Math.floor(this.overlapTokens * this.charsPerToken);
        
        while (currentPosition < text.length) {
            let chunkEnd = Math.min(currentPosition + safeCharLimit, text.length);
            
            // Find natural breakpoints if not at end
            if (chunkEnd < text.length) {
                const searchStart = Math.max(currentPosition + safeCharLimit * 0.7, currentPosition + 1000);
                
                const breakpoints = [
                    text.lastIndexOf('<page-', chunkEnd),
                    text.lastIndexOf('\n\n', chunkEnd),
                    text.lastIndexOf('. ', chunkEnd),
                    text.lastIndexOf(' ', chunkEnd)
                ];
                
                for (const breakpoint of breakpoints) {
                    if (breakpoint > searchStart) {
                        chunkEnd = breakpoint + (breakpoint === breakpoints[2] ? 2 : 1);
                        break;
                    }
                }
            }
            
            const chunkText = text.substring(currentPosition, chunkEnd).trim();
            if (chunkText.length > 0) {
                chunks.push({
                    content: chunkText,
                    index: chunks.length + 1,
                    tokens: this.estimateTokens(chunkText),
                    length: chunkText.length
                });
            }
            
            // Move to next chunk with overlap
            currentPosition = Math.max(chunkEnd - overlapChars, chunkEnd);
            
            // Prevent infinite loops
            if (currentPosition >= chunkEnd && chunkEnd < text.length) {
                currentPosition = chunkEnd;
            }
        }
        
        return chunks;
    }

    /**
     * Create prompt for a chunk
     */
    createPrompt(chunk, totalChunks) {
        return `Based on this study material excerpt (Part ${chunk.index}/${totalChunks}), create ${this.flashcardsPerChunk} high-quality flashcards.

Study Material:
${chunk.content}

Requirements:
1. Generate exactly ${this.flashcardsPerChunk} flashcards
2. Focus on key concepts from this section
3. Each flashcard: clear question/term (front) and accurate answer (back)
4. Return only JSON array format

JSON format:
[{"front": "question", "back": "answer", "source": "Part ${chunk.index}"}]`;
    }

    /**
     * Process a single chunk
     */
    async processChunk(chunk, totalChunks) {
        const prompt = this.createPrompt(chunk, totalChunks);
        
        const requestData = {
            model: this.model,
            messages: [
                {
                    role: "system",
                    content: "You are a professional educator. Return only valid JSON arrays with flashcard objects."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: this.temperature,
            max_tokens: 800
        };

        try {
            const response = await axios.post(this.apiUrl, requestData, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            const reply = response.data.choices[0].message.content.trim();
            
            try {
                const flashcards = JSON.parse(reply);
                if (Array.isArray(flashcards)) {
                    return flashcards.map(card => ({
                        front: card.front,
                        back: card.back,
                        source: card.source || `Part ${chunk.index}`,
                        chunkIndex: chunk.index
                    }));
                }
            } catch (parseError) {
                // Fallback: try to extract flashcards from text
                return this.extractFlashcardsFromText(reply, chunk.index);
            }
            
            return [];
            
        } catch (error) {
            console.error(`Error processing chunk ${chunk.index}:`, error.response?.data || error.message);
            return [];
        }
    }

    /**
     * Extract flashcards from malformed responses
     */
    extractFlashcardsFromText(text, chunkIndex) {
        const flashcards = [];
        const jsonMatches = text.match(/\{[^}]*"front"[^}]*\}/g);
        
        if (jsonMatches) {
            jsonMatches.forEach(match => {
                try {
                    const card = JSON.parse(match);
                    if (card.front && card.back) {
                        flashcards.push({
                            front: card.front,
                            back: card.back,
                            source: `Part ${chunkIndex}`,
                            chunkIndex: chunkIndex
                        });
                    }
                } catch (e) {
                    // Skip invalid cards
                }
            });
        }
        
        return flashcards;
    }

    /**
     * Remove duplicate flashcards
     */
    removeDuplicates(flashcards) {
        const unique = [];
        const seen = new Set();
        
        for (const card of flashcards) {
            const key = card.front.toLowerCase().trim();
            if (!seen.has(key)) {
                unique.push(card);
                seen.add(key);
            }
        }
        
        return unique;
    }

    /**
     * Main method - returns flashcards as variable
     */
    async generateFlashcards(text) {
        try {
            // Create chunks
            const chunks = this.createChunks(text);
            
            const summary = {
                originalLength: text.length,
                estimatedTokens: this.estimateTokens(text),
                chunksCreated: chunks.length,
                chunks: chunks.map(chunk => ({
                    index: chunk.index,
                    tokens: chunk.tokens,
                    length: chunk.length
                }))
            };
            
            // Process all chunks
            const allFlashcards = [];
            
            for (const chunk of chunks) {
                const flashcards = await this.processChunk(chunk, chunks.length);
                allFlashcards.push(...flashcards);
                
                // Rate limiting delay
                if (chunk.index < chunks.length) {
                    await new Promise(resolve => setTimeout(resolve, this.requestDelay));
                }
            }
            
            // Remove duplicates
            const uniqueFlashcards = this.removeDuplicates(allFlashcards);
            
            return {
                success: true,
                flashcards: uniqueFlashcards,
                summary: {
                    ...summary,
                    totalGenerated: allFlashcards.length,
                    uniqueFlashcards: uniqueFlashcards.length,
                    duplicatesRemoved: allFlashcards.length - uniqueFlashcards.length
                }
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                flashcards: []            };
        }
    }
}

export default FlashcardGenerator;
