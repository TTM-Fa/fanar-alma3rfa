import OpenAI from 'openai';
import axios from 'axios';

// OpenAI client for embeddings
const embedClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class ChatRAGService {
  constructor() {
    this.chunks = new Map(); // materialId -> chunks
    this.fanarApiUrl = "https://api.fanar.qa/v1/chat/completions";
    this.fanarModel = "Fanar-S-1-7B";
    this.fanarApiKey = process.env.FANAR_API_KEY;
  }

  // Utility: cosine similarity
  cosineSim(a, b) {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1e-9);
  }

  // Simple sentence-aware splitter
  splitText(text, maxLen = 1000) {
    const chunks = [];
    let buf = '';
    for (const sent of text.split(/(?<=[.?!])\s+/)) {
      if (buf.length + sent.length > maxLen) {
        chunks.push(buf.trim());
        buf = sent + ' ';
      } else {
        buf += sent + ' ';
      }
    }
    if (buf) chunks.push(buf.trim());
    return chunks;
  }

  // Initialize material chunks
  async initializeMaterial(materialId, rawContent) {
    try {
      // Split content into chunks
      const textChunks = this.splitText(rawContent, 1000);

      // Embed all chunks
      const embedRes = await embedClient.embeddings.create({
        model: 'text-embedding-ada-002',
        input: textChunks,
      });

      // Store chunks with embeddings
      const chunks = textChunks.map((text, i) => ({
        text,
        embedding: embedRes.data[i].embedding,
      }));

      this.chunks.set(materialId, chunks);
      return { success: true, chunkCount: chunks.length };
    } catch (error) {
      console.error('Error initializing material chunks:', error);
      throw error;
    }
  }

  // Process a chat question
  async processQuestion(materialId, question, chatHistory = []) {
    try {
      // Get chunks for this material
      const materialChunks = this.chunks.get(materialId);
      if (!materialChunks || materialChunks.length === 0) {
        throw new Error('Material not initialized. Please initialize chunks first.');
      }

      // Embed the question
      const qRes = await embedClient.embeddings.create({
        model: 'text-embedding-ada-002',
        input: question,
      });
      const qEmb = qRes.data[0].embedding;

      // Score each chunk
      const scored = materialChunks
        .map((chunk, i) => ({
          text: chunk.text,
          embedding: chunk.embedding,
          index: i,
          score: this.cosineSim(qEmb, chunk.embedding),
        }))
        .sort((a, b) => b.score - a.score);

      // Pick top chunks above threshold
      const SIM_THRESH = 0.75;
      const topChunks = scored.filter(c => c.score > SIM_THRESH).slice(0, 5);

      if (topChunks.length === 0) {
        return {
          answer: "I cannot answer this question based on the provided content.",
          references: []
        };
      }

      // Build context from top chunks
      const context = topChunks
        .map((c, i) => `[${i + 1}] ${c.text}`)
        .join('\n\n');

      // Build system prompt
      const systemPrompt = `
You are a professional assistant. Answer the user's question STRICTLY using the context below.
If the answer isn't in the context, say "I cannot answer that based on the document."

--- CONTEXT START ---
${context}
--- CONTEXT END ---
`.trim();

      // Prepare messages including chat history
      const messages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-6), // Include last 6 messages for context
        { role: 'user', content: question }
      ];      // Call Fanar's LLM using axios (same as FlashcardGenerator)
      const response = await axios.post(
        this.fanarApiUrl,
        {
          model: this.fanarModel,
          messages,
          temperature: 0.1,
          max_tokens: 500,
        },
        {
          headers: {
            Authorization: `Bearer ${this.fanarApiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 60000,
        }
      );

      const answer = response.data.choices[0].message.content;

      return {
        answer,
        references: topChunks.map(c => ({
          id: c.index,
          score: c.score,
          text: c.text.slice(0, 150) + (c.text.length > 150 ? '…' : '')
        }))
      };

    } catch (error) {
      console.error('RAG processing error:', error);
      throw error;
    }
  }

  // Clean up chunks for a material
  clearMaterial(materialId) {
    this.chunks.delete(materialId);
  }
}

// Create singleton instance
const chatRAGService = new ChatRAGService();

export default chatRAGService;
