// app/api/trace/route.js

import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    // 1) pull both code & lang from the client
    const { code, lang = "English" } = await req.json();
    if (!code?.trim()) {
      return NextResponse.json(
        { error: "Code is required" },
        { status: 400 }
      );
    }

    // 2) pick header names based on lang
    const [H1, H2, H3, H4] =
      lang === "العربية"
        ? ["خطوات", "عبارة", "المتغيرات", "نتيجة"]
        : ["Step", "Statement", "Variables", "Output"];

    // 3) build the prompt, embedding those exact headers
    const prompt = `
      You are a PRECISE CODE EXECUTION TRACER. Generate a Simple Trace Table as an HTML <table> with EXACTLY four columns, with these headers (in this order):

      1. ${H1} – sequential number starting at 1  
      2. ${H2} – the exact line or expression being executed  
      3. ${H3} – the state of ALL variables (name: value) **after** that line runs  
      4. ${H4} – any printed or returned output (or condition result)

      STRICT RULES:
      - Output ONLY the raw HTML <table>…</table> (no extra text, no Markdown)
      - For each executable line create one <tr> with four <td> cells
      - Show every function call, loop, condition, and top-level statement
      - In the ${H4} cell, write “Condition: …” for branches or “Return: …” when a function returns
      - Even if a variable did not change on a step, it must still appear in the ${H3} cell
      - After generating, do NOT wrap in any backticks or code fences

      TRACE THIS CODE:
      \`\`\`python
      ${code}
      \`\`\`
      `
    ;

    // 4) call the model
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      temperature: 0,
      max_tokens: 3000,
      messages: [
        {
          role: "system",
          content:
            "You are a precise code execution tracer. Output only HTML tables with no explanations."
        },
        { role: "user", content: prompt }
      ]
    });

    // 5) extract & clean the table HTML
    let tableHtml = completion.choices[0].message.content
      .trim()
      .replace(/```html?|```/gi, "");

    if (!tableHtml.startsWith("<table")) {
      tableHtml = `<table>${tableHtml}</table>`;
    }

    // 6) inject tailswind classes
    tableHtml = tableHtml
      .replace(
        /<table(.*?)>/,
        '<table$1 class="w-full border border-collapse text-sm">'
      )
      .replace(
        /<(t[hd])(.*?)>/g,
        (_m, tag, rest) =>
          `<${tag}${rest} class="border px-3 py-1 font-mono">`
      );

    // 7) send back
    return NextResponse.json({ tableHtml });
  } catch (err) {
    console.error("Trace generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate trace table. Please check code syntax." },
      { status: 500 }
    );
  }
}
