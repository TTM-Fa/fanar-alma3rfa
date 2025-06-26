// app/api/chat/route.js

import OpenAI from 'openai';
import { NextResponse } from 'next/server';

// ── OpenAI client **for embeddings** ─────────────────────────────────────────
const embedClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ── Fanar client **for chat** ────────────────────────────────────────────────
const fanarClient = new OpenAI({
  apiKey:  process.env.FANAR_API_KEY,
  baseURL: process.env.OPENAI_API_BASE,  // e.g. "https://api.fanar.qa/v1"
});

// ── Utility: cosine similarity ───────────────────────────────────────────────
function cosineSim(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1e-9);
}

export const POST = async (req) => {
  const { question, mode = 'normal' } = await req.json();

  // Guard: make sure we have chunks
  if (!global.__DOC_CHUNKS__?.length) {
    return NextResponse.json(
      { error: "No documents ingested. Please upload a PDF first." },
      { status: 400 }
    );
  }

  try {
    // ── 1️⃣ Embed the question with OpenAI ────────────────────────────────────
    const qRes  = await embedClient.embeddings.create({
      model: 'text-embedding-ada-002',
      input: question,
    });
    const qEmb = qRes.data[0].embedding;

    // ── 2️⃣ Score each chunk ─────────────────────────────────────────────────
    const scored = global.__DOC_CHUNKS__
      .map((chunk, i) => ({
        text:  chunk.text,
        embedding: chunk.embedding,
        index: i,
        score: cosineSim(qEmb, chunk.embedding),
      }))
      .sort((a,b) => b.score - a.score);

    // ── 3️⃣ Pick top chunks above threshold ──────────────────────────────────
    const SIM_THRESH = 0.75;
    const topChunks = scored.filter(c => c.score > SIM_THRESH).slice(0, 5);

    if (topChunks.length === 0) {
      return NextResponse.json({
        answer: "I cannot answer this question based on the provided content.",
        references: []
      });
    }

    // ── 4️⃣ Build your system prompt with those chunks ────────────────────────
    const context = topChunks
      .map((c, i) => `[${i+1}] ${c.text}`)
      .join('\n\n');

    const systemPrompt = `
You are a professional assistant. Answer the user's question STRICTLY using the context below.
If the answer isn't in the context, say "I cannot answer that based on the document."

--- CONTEXT START ---
${context}
--- CONTEXT END ---
`.trim();

    // ── 5️⃣ Call Fanar’s LLM ────────────────────────────────────────────────
    const chatRes = await fanarClient.chat.completions.create({
      model: 'Fanar-S-1-7B',   // Fanar’s best chat model
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: question }
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const answer = chatRes.choices[0].message.content;

    // ── Optional: OpenAI chat fallback (commented out) ──────────────────────
    /*
    const chatResOA = await embedClient.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role:'system', content: systemPrompt },
        { role:'user',   content: question }
      ],
      temperature: 0.1,
      max_tokens: 500,
    });
    const answerOA = chatResOA.choices[0].message.content;
    */

    // ── 6️⃣ Return the answer + metadata ────────────────────────────────────
    return NextResponse.json({
      answer,
      references: topChunks.map(c => ({
        id:    c.index,
        score: c.score,
        text:  c.text.slice(0, 150) + (c.text.length>150?'…':'')
      }))
    });

  } catch (err) {
    console.error('RAG processing error:', err);
    return NextResponse.json(
      { error: "Failed to process question" },
      { status: 500 }
    );
  }
};
