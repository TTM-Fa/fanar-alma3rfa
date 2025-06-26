// app/api/upload/route.js

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { rawContent } from '@/app/api/upload/rawContent';  // adjust path if needed

// 1️⃣ Simple sentence-aware splitter (~1 000 chars per chunk)
function splitText(text, maxLen = 1000) {
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

// 2️⃣ OpenAI client for embeddings
const embedClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const POST = async () => {
  try {
    // 3️⃣ Use the imported static rawContent
    const chunks = splitText(rawContent, 1000);

    // 4️⃣ Embed all chunks in one batch
    const embedRes = await embedClient.embeddings.create({
      model: 'text-embedding-ada-002',
      input: chunks,
    });

    // 5️⃣ Store globally for your chat route
    global.__DOC_CHUNKS__ = chunks.map((txt, i) => ({
      text:      txt,
      embedding: embedRes.data[i].embedding,
    }));

    return NextResponse.json({
      success:    true,
      chunkCount: chunks.length,
    });
  } catch (err) {
    console.error('Upload handler error:', err);
    return NextResponse.json(
      { error: err.message || 'Ingestion failed' },
      { status: 500 }
    );
  }
};
