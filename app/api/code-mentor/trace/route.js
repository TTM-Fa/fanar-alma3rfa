import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    console.log("=== TRACE API CALLED ===");

    // Check if OpenAI API key exists
    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key is missing!");
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const { code, lang = "English" } = await req.json();
    console.log("Request received with code length:", code?.length);

    if (!code?.trim()) {
      return NextResponse.json(
        {
          error: lang === "العربية" ? "الكود مطلوب" : "Code is required",
        },
        { status: 400 }
      );
    }

    // Check if code is too complex
    const lineCount = code.split("\n").length;
    if (lineCount > 50) {
      return NextResponse.json(
        {
          error:
            lang === "العربية"
              ? "الكود معقد جداً لتحليل التتبع. يرجى استخدام مثال أقصر."
              : "Code is too complex for trace analysis. Please use a shorter example.",
        },
        { status: 400 }
      );
    }

    // Headers based on language
    const headers =
      lang === "العربية"
        ? ["الخطوة", "العبارة", "المتغيرات", "الناتج"]
        : ["Step", "Statement", "Variables", "Output"];

    const prompt = `
You are a precise code execution tracer. Your task is to create a step-by-step execution trace of the given code.

IMPORTANT: Respond with ONLY a JSON object in this exact format:
{
  "traceSteps": [
    {
      "step": 1,
      "statement": "exact code line or expression",
      "variables": "current state of all variables after this step",
      "output": "any output produced by this step"
    }
  ]
}

RULES:
1. Each executable line gets one trace step
2. Show the exact code statement being executed
3. Show ALL variable states after each step (even if unchanged)
4. For output: show print statements, return values, or condition results
5. Use empty string "" if no output for that step
6. Variables should be formatted like: "x: 5, y: 'hello', z: [1, 2, 3]"
7. For conditions, output should be like: "Condition: True" or "Condition: False"
8. For function returns, output should be like: "Return: value"

Example:
For code: x = 5; print(x)
Response: {
  "traceSteps": [
    {"step": 1, "statement": "x = 5", "variables": "x: 5", "output": ""},
    {"step": 2, "statement": "print(x)", "variables": "x: 5", "output": "5"}
  ]
}

CODE TO TRACE:
${code}
`;

    console.log("Making OpenAI request...");
    console.log("Using model: gpt-4");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a code execution tracer. Always respond with valid JSON only, no explanations or markdown formatting.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    console.log("OpenAI request completed successfully");
    let content = completion.choices[0].message.content.trim();
    console.log("Response content preview:", content.substring(0, 200) + "...");

    // Clean up the response - remove any markdown formatting
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "");

    let responseData;
    try {
      responseData = JSON.parse(content);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("Raw content:", content);

      // Fallback error response
      const errorMessage =
        lang === "العربية"
          ? "فشل في تحليل استجابة التتبع"
          : "Failed to parse trace response";

      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const traceSteps = responseData.traceSteps || [];

    if (!Array.isArray(traceSteps) || traceSteps.length === 0) {
      const errorMessage =
        lang === "العربية"
          ? "لا يمكن تتبع تنفيذ الكود. يرجى التحقق من صحة الكود."
          : "Unable to trace code execution. Please check code syntax.";

      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    // Return structured data for client-side rendering
    return NextResponse.json({
      headers: headers,
      traceSteps: traceSteps,
    });
  } catch (error) {
    console.error("=== TRACE API ERROR ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    const isArabic = lang === "العربية";

    // Check for specific OpenAI errors
    if (error.message?.includes("API key")) {
      return NextResponse.json(
        { error: "OpenAI API key issue: " + error.message },
        { status: 500 }
      );
    }

    if (error.message?.includes("rate limit")) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    const errorMessage = isArabic
      ? "فشل في إنشاء جدول التتبع. يرجى التحقق من صحة الكود."
      : "Failed to generate trace table. Please check code syntax.";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
