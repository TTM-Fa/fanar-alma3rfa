import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request) {
  try {
    const { text, targetLanguage, sourceLanguage = 'auto' } = await request.json();
    
    if (!text) {
      return NextResponse.json(
        { success: false, error: "No text provided" },
        { status: 400 }
      );
    }

    if (!targetLanguage) {
      return NextResponse.json(
        { success: false, error: "Target language not specified" },
        { status: 400 }
      );
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    console.log('Translation request:', { 
      textLength: text.length, 
      targetLanguage, 
      sourceLanguage 
    });

    // Create translation prompt based on target language
    let translationPrompt;
    if (targetLanguage === 'ar') {
      translationPrompt = `Translate the following text to Modern Standard Arabic. Maintain the meaning, context, and technical terms accurately. If the text contains academic or technical content, preserve the specialized terminology while making it accessible in Arabic.

Text to translate: "${text}"

Provide only the Arabic translation without any additional text or explanations.`;
    } else if (targetLanguage === 'en') {
      translationPrompt = `Translate the following text to English. Maintain the meaning, context, and technical terms accurately. If the text contains academic or technical content, preserve the specialized terminology.

Text to translate: "${text}"

Provide only the English translation without any additional text or explanations.`;
    } else {
      return NextResponse.json(
        { success: false, error: "Unsupported target language. Only 'en' and 'ar' are supported." },
        { status: 400 }
      );
    }

    // Use GPT for translation
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional translator with expertise in academic and technical content. Provide accurate, contextual translations while preserving meaning and terminology."
        },
        {
          role: "user",
          content: translationPrompt
        }
      ],
      temperature: 0.1, // Low temperature for consistent translations
      max_tokens: Math.min(4000, text.length * 2), // Reasonable token limit
    });

    const translatedText = response.choices[0].message.content.trim();

    if (!translatedText) {
      return NextResponse.json(
        { success: false, error: "Translation failed - no output received" },
        { status: 500 }
      );
    }

    console.log('Translation completed:', { 
      originalLength: text.length, 
      translatedLength: translatedText.length 
    });

    return NextResponse.json({
      success: true,
      translatedText,
      originalText: text,
      targetLanguage,
      sourceLanguage
    });

  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.response?.data?.error || error.message || "Translation failed" 
      },
      { status: 500 }
    );
  }
}
