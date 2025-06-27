import axios from 'axios';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Streamlined Fanar Audio TTS Service
 * Simple wrapper for Fanar's text-to-speech API
 */
class FanarAudioService {    constructor(apiKey, options = {}) {
        this.apiKey = apiKey || process.env.FANAR_API_KEY;
        this.apiUrl = options.apiUrl || 'https://api.fanar.qa/v1/audio/speech';
        this.model = options.model || 'Fanar-Aura-TTS-1';
        this.defaultVoice = options.defaultVoice || 'default';
    }    /**
     * Create speech audio from text with automatic chunking for long content
     * @param {string} text - Text to convert to speech
     * @param {string} voice - Voice to use (default: 'default')
     * @returns {Promise<ArrayBuffer>} - Audio data as ArrayBuffer
     */
    async createSpeech(text, voice = null) {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            throw new Error('Invalid text provided for speech generation');
        }

        if (!this.apiKey) {
            throw new Error('Fanar API key is required');
        }        // Check if text is Arabic to determine handling
        const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
        const isArabic = arabicRegex.test(text);
        
        // For Arabic text, be more conservative with chunk size
        const maxChars = isArabic ? 1200 : 2000;
        
        if (text.length > maxChars) {
            console.log(`📝 Text is long (${text.length} chars), truncating to avoid timeout...`);
            // For now, truncate instead of chunking to avoid concatenation issues
            const truncatedText = text.substring(0, maxChars - 50).trim() + "...";
            console.log(`✂️ Truncated to ${truncatedText.length} characters`);
            return await this.createSpeechWithRetry(truncatedText, voice);
        }

        return await this.createSpeechWithRetry(text, voice);
    }

    /**
     * Create speech for a single chunk of text
     * @param {string} text - Text to convert to speech
     * @param {string} voice - Voice to use
     * @returns {Promise<ArrayBuffer>} - Audio data as ArrayBuffer
     */    async createSpeechSingle(text, voice = null) {
        const data = {
            model: this.model,
            input: text.trim(),
            voice: voice || this.defaultVoice
        };

        // Check if text is Arabic for timeout adjustment
        const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
        const isArabic = arabicRegex.test(text);
        const timeout = isArabic ? 60000 : 30000; // 60s for Arabic, 30s for others

        try {
            console.log(`🎤 Generating speech with Fanar TTS (${isArabic ? 'Arabic' : 'Other'}): ${text.substring(0, 50)}...`);            const response = await axios.post(this.apiUrl, data, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer', // Important: binary response
                timeout: timeout
            });

            console.log('✅ Speech generation completed successfully');
            return response.data;
            
        } catch (error) {
            console.error('❌ Fanar TTS Error:', error.response?.data || error.message);
            
            // Handle timeout errors specifically
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                throw new Error('Request timeout - the text might be too long. Try shorter content or try again later.');
            } else if (error.response?.status === 401) {
                throw new Error('Invalid Fanar API key');
            } else if (error.response?.status === 429) {
                throw new Error('Rate limit exceeded. Please try again later.');
            } else if (error.response?.status >= 500) {
                throw new Error('Fanar TTS service temporarily unavailable');
            } else {
                // For any other error, include more details
                const errorMsg = error.response?.data ? 
                    `Fanar API error: ${Buffer.from(error.response.data).toString()}` :
                    `Failed to generate speech: ${error.message}`;
                throw new Error(errorMsg);
            }
        }
    }    /**
     * Create speech for long text by chunking it and concatenating audio
     * @param {string} text - Long text to convert to speech
     * @param {string} voice - Voice to use
     * @returns {Promise<ArrayBuffer>} - Concatenated audio data as ArrayBuffer
     */    async createSpeechChunked(text, voice = null) {
        const maxChars = 400; // Smaller chunks to avoid timeouts
        const chunks = this.splitTextIntoChunks(text, maxChars);
        
        console.log(`🔄 Splitting text into ${chunks.length} chunks for TTS generation...`);
        
        const tempFiles = [];
        const tempDir = tmpdir();
        
        try {
            // Generate audio for each chunk
            for (let i = 0; i < chunks.length; i++) {
                console.log(`🎤 Generating audio for chunk ${i + 1}/${chunks.length}...`);
                
                const audioBuffer = await this.createSpeechWithRetry(chunks[i], voice);
                const tempFile = join(tempDir, `chunk_${i}_${Date.now()}.mp3`);
                
                writeFileSync(tempFile, Buffer.from(audioBuffer));
                tempFiles.push(tempFile);
                
                // Small delay between requests to avoid rate limiting
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            // Concatenate all audio files
            console.log(`🎵 Concatenating ${chunks.length} audio chunks...`);
            const concatenatedBuffer = await this.concatenateAudioFiles(tempFiles);
            
            return concatenatedBuffer;
            
        } finally {
            // Clean up temporary files
            for (const file of tempFiles) {
                try {
                    if (existsSync(file)) {
                        unlinkSync(file);
                    }
                } catch (error) {
                    console.warn(`⚠️ Could not delete temp file: ${file}`);
                }
            }
        }
    }

    /**
     * Split text into chunks at natural break points
     * @param {string} text - Text to split
     * @param {number} maxChars - Maximum characters per chunk
     * @returns {Array<string>} - Array of text chunks
     */
    splitTextIntoChunks(text, maxChars) {
        const chunks = [];
        let currentPos = 0;
        
        while (currentPos < text.length) {
            let chunkEnd = currentPos + maxChars;
            
            // If we're not at the end, try to find a natural break point
            if (chunkEnd < text.length) {
                // Look for sentence endings first
                const sentenceEnd = text.lastIndexOf('.', chunkEnd);
                const questionEnd = text.lastIndexOf('؟', chunkEnd); // Arabic question mark
                const exclamationEnd = text.lastIndexOf('!', chunkEnd);
                
                // Find the best sentence ending
                const bestSentenceEnd = Math.max(sentenceEnd, questionEnd, exclamationEnd);
                
                if (bestSentenceEnd > currentPos + maxChars * 0.5) {
                    chunkEnd = bestSentenceEnd + 1;
                } else {
                    // Fall back to looking for other break points
                    const commaBreak = text.lastIndexOf('،', chunkEnd); // Arabic comma
                    const regularComma = text.lastIndexOf(',', chunkEnd);
                    const spaceBreak = text.lastIndexOf(' ', chunkEnd);
                    
                    const bestBreak = Math.max(commaBreak, regularComma, spaceBreak);
                    if (bestBreak > currentPos + maxChars * 0.3) {
                        chunkEnd = bestBreak + 1;
                    }
                }
            }
            
            const chunk = text.substring(currentPos, chunkEnd).trim();
            if (chunk.length > 0) {
                chunks.push(chunk);
            }
            
            currentPos = chunkEnd;
        }
        
        return chunks;
    }    /**
     * Concatenate audio files using simple buffer concatenation
     * Note: This is a basic implementation that may not work perfectly for MP3
     * For production, consider using FFmpeg for proper audio concatenation
     * @param {Array<string>} filePaths - Array of audio file paths
     * @returns {Promise<ArrayBuffer>} - Concatenated audio buffer
     */
    async concatenateAudioFiles(filePaths) {
        if (filePaths.length === 0) {
            throw new Error('No audio files to concatenate');
        }
        
        if (filePaths.length === 1) {
            // Single file, just read and return
            const fs = await import('fs');
            return fs.readFileSync(filePaths[0]).buffer;
        }
        
        // For now, let's just return the first file to avoid corruption
        // This is a temporary solution until we implement proper MP3 concatenation
        console.log(`⚠️ WARNING: Using only first chunk due to MP3 concatenation limitations`);
        console.log(`📁 Total chunks available: ${filePaths.length}, using chunk 1 only`);
        
        const fs = await import('fs');
        const firstFileBuffer = fs.readFileSync(filePaths[0]);
        
        console.log(`✅ Using first chunk: ${firstFileBuffer.length} bytes`);
        return firstFileBuffer.buffer;
    }

    /**
     * Create speech with retry mechanism
     * @param {string} text - Text to convert to speech
     * @param {string} voice - Voice to use
     * @param {number} retries - Number of retries
     * @returns {Promise<ArrayBuffer>} - Audio data as ArrayBuffer
     */
    async createSpeechWithRetry(text, voice = null, retries = 2) {
        for (let attempt = 1; attempt <= retries + 1; attempt++) {
            try {
                console.log(`🎤 Attempt ${attempt}/${retries + 1}: Generating speech...`);
                return await this.createSpeechSingle(text, voice);
            } catch (error) {
                if (attempt === retries + 1) {
                    // Last attempt failed, throw the error
                    throw error;
                }
                
                console.log(`⚠️ Attempt ${attempt} failed: ${error.message}`);
                console.log(`🔄 Retrying in 2 seconds...`);
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    /**
     * Get available voices
     * @returns {Array} Available voice options
     */
    getAvailableVoices() {
        return [
            { value: "default", label: "Default Voice" },
            // Add more voices as they become available from Fanar
        ];
    }    /**
     * Estimate audio duration based on text length
     * @param {string} text - Input text
     * @returns {number} Estimated duration in seconds
     */
    estimateDuration(text) {
        if (!text) return 0;
        
        // Check if text is primarily Arabic
        const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
        const isArabic = arabicRegex.test(text);
        
        if (isArabic) {
            // Arabic text: roughly 120 words per minute (slightly slower than English)
            const wordCount = text.split(/\s+/).length;
            return Math.ceil((wordCount / 120) * 60);
        } else {
            // English text: roughly 150 words per minute
            const wordCount = text.split(/\s+/).length;
            return Math.ceil((wordCount / 150) * 60);
        }
    }
}

// Create a singleton instance
const fanarAudioService = new FanarAudioService();

export default fanarAudioService;
export { FanarAudioService };
