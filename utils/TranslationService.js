import axios from 'axios';

/**
 * Streamlined Translation Service for Fanar Alma3rfa
 * Supports English to Arabic translation for flashcards
 */
class TranslationService {    constructor(apiKey, options = {}) {
        this.apiKey = apiKey;
        this.apiUrl = options.apiUrl || 'https://api.fanar.qa/v1/translations';
        this.model = options.model || 'Fanar-Shaheen-MT-1';
        this.defaultLangPair = options.defaultLangPair || 'en-ar'; // English to Arabic
        this.preprocessing = options.preprocessing || 'default';
        this.requestDelay = options.requestDelay || 1000; // Increased default delay for rate limiting
        this.maxRetries = options.maxRetries || 3; // Add retry capability
        this.retryDelay = options.retryDelay || 2000; // Delay between retries
    }    /**
     * Translate a single text from English to Arabic with retry logic
     */
    async translateText(text, targetLang = 'ar') {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            console.warn('⚠️ Empty or invalid text provided for translation');
            return text; // Return original text if invalid
        }

        // Skip translation if text is already in Arabic or very short
        if (this.isArabicText(text) || text.trim().length < 3) {
            return text;
        }

        let lastError;
        
        // Retry logic for rate limiting and temporary failures
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const langPair = targetLang === 'ar' ? 'en-ar' : 'ar-en';
                
                console.log(`🔄 Translating (attempt ${attempt}/${this.maxRetries}): "${text.substring(0, 50)}..." (${langPair})`);

                const response = await axios.post(this.apiUrl, {
                    model: this.model,
                    text: text.trim(),
                    langpair: langPair,
                    preprocessing: this.preprocessing
                }, {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000 // 30 second timeout
                });

                const translatedText = response.data?.text;
                
                if (translatedText && translatedText.trim().length > 0) {
                    console.log(`✅ Translation complete: "${translatedText.substring(0, 50)}..."`);
                    return translatedText.trim();
                } else {
                    console.warn('⚠️ Empty translation response, returning original text');
                    return text;
                }

            } catch (error) {
                lastError = error;
                const isRateLimit = error.response?.status === 429;
                const isServerError = error.response?.status >= 500;
                
                console.error(`❌ Translation attempt ${attempt} failed for "${text.substring(0, 30)}...":`, error.message);
                
                // If it's a rate limit error or server error and we have retries left, wait and retry
                if ((isRateLimit || isServerError) && attempt < this.maxRetries) {
                    const waitTime = isRateLimit ? this.retryDelay * attempt : this.retryDelay;
                    console.log(`⏱️ Rate limit/server error detected. Waiting ${waitTime}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
                
                // If it's the last attempt or a non-retryable error, break
                break;
            }
        }
        
        console.error(`❌ Translation failed after ${this.maxRetries} attempts for "${text.substring(0, 30)}...":`, lastError?.message);
        // Return original text on failure
        return text;
    }

    /**
     * Translate multiple flashcards
     */
    async translateFlashcards(flashcards, targetLang = 'ar') {
        if (!flashcards || !Array.isArray(flashcards) || flashcards.length === 0) {
            console.warn('⚠️ No flashcards provided for translation');
            return flashcards;
        }

        console.log(`🌐 Starting translation of ${flashcards.length} flashcards to ${targetLang === 'ar' ? 'Arabic' : 'English'}`);
        
        const translatedFlashcards = [];
        const errors = [];

        for (let i = 0; i < flashcards.length; i++) {
            const card = flashcards[i];
            
            try {
                console.log(`🔄 Translating flashcard ${i + 1}/${flashcards.length}...`);

                // Translate both question and answer
                const [translatedQuestion, translatedAnswer] = await Promise.all([
                    this.translateText(card.question || card.front, targetLang),
                    this.translateText(card.answer || card.back, targetLang)
                ]);

                translatedFlashcards.push({
                    ...card,
                    question: translatedQuestion,
                    answer: translatedAnswer,
                    front: translatedQuestion, // Support both formats
                    back: translatedAnswer,
                    originalQuestion: card.question || card.front,
                    originalAnswer: card.answer || card.back,
                    translatedTo: targetLang
                });

                // Rate limiting delay
                if (i < flashcards.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, this.requestDelay));
                }

            } catch (error) {
                console.error(`❌ Failed to translate flashcard ${i + 1}:`, error.message);
                
                // Keep original flashcard if translation fails
                translatedFlashcards.push({
                    ...card,
                    question: card.question || card.front,
                    answer: card.answer || card.back,
                    front: card.question || card.front,
                    back: card.answer || card.back,
                    translationError: error.message
                });
                
                errors.push(`Card ${i + 1}: ${error.message}`);
            }
        }

        const successCount = translatedFlashcards.filter(card => !card.translationError).length;
        console.log(`🌐 Translation complete: ${successCount}/${flashcards.length} flashcards translated successfully`);
        
        if (errors.length > 0) {
            console.warn(`⚠️ Translation errors encountered:`, errors);
        }

        return translatedFlashcards;
    }

    /**
     * Check if text contains Arabic characters
     */
    isArabicText(text) {
        if (!text) return false;
        
        // Check for Arabic Unicode range
        const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
        return arabicRegex.test(text);
    }

    /**
     * Batch translate with chunking for large sets
     */
    async translateFlashcardsBatch(flashcards, targetLang = 'ar', batchSize = 5) {
        if (!flashcards || flashcards.length === 0) return flashcards;

        console.log(`🔄 Starting batch translation of ${flashcards.length} flashcards (batch size: ${batchSize})`);
        
        const results = [];
        
        for (let i = 0; i < flashcards.length; i += batchSize) {
            const batch = flashcards.slice(i, i + batchSize);
            console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(flashcards.length / batchSize)}`);
            
            const batchResults = await this.translateFlashcards(batch, targetLang);
            results.push(...batchResults);
            
            // Longer delay between batches
            if (i + batchSize < flashcards.length) {
                console.log(`⏱️ Waiting between batches...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        return results;
    }

    /**
     * Get translation statistics
     */
    getTranslationStats(flashcards) {
        if (!flashcards || !Array.isArray(flashcards)) return null;
        
        const totalCards = flashcards.length;
        const translatedCards = flashcards.filter(card => card.translatedTo).length;
        const errorCards = flashcards.filter(card => card.translationError).length;
        const arabicCards = flashcards.filter(card => 
            this.isArabicText(card.question) || this.isArabicText(card.answer)
        ).length;
        
        return {
            total: totalCards,
            translated: translatedCards,
            errors: errorCards,
            arabicContent: arabicCards,
            successRate: totalCards > 0 ? Math.round((translatedCards / totalCards) * 100) : 0
        };
    }
}

export default TranslationService;
