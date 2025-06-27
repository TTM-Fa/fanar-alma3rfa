import { NextResponse } from "next/server";
import { prisma } from "@/utils/database";
import OpenAI from "openai";
import { put } from "@vercel/blob";
import fanarAudioService from "@/utils/fanarAudioService";
import TranslationService from "@/utils/TranslationService";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize translation service
const translationService = new TranslationService(process.env.FANAR_API_KEY);

export async function POST(request) {
  try {
    const { materialId, title, voice, style, duration, language, translateToArabic } = await request.json();

    // Validate input
    if (!materialId) {
      return NextResponse.json(
        { success: false, error: "Material ID is required" },
        { status: 400 }
      );
    }

    // Get the material with raw content
    const material = await prisma.material.findUnique({
      where: { id: materialId },
    });

    if (!material) {
      return NextResponse.json(
        { success: false, error: "Material not found" },
        { status: 404 }
      );
    }

    if (!material.rawContent) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Material does not have any content to generate an audio lecture from",
        },
        { status: 400 }
      );
    }    // Create the audio lecture record in the database with "processing" status
    const audioLecture = await prisma.audioLecture.create({
      data: {
        title: title || `Audio Lecture: ${material.title || "Study Material"}`,
        audioUrl: "", // Will be updated later
        status: "processing",
        materialId: material.id,
      },
    });

    // Start processing in the background
    processAudioLecture(audioLecture.id, material.rawContent, {
      title: title || `Audio Lecture: ${material.title || "Study Material"}`,
      voice: voice || "default",
      style: style || null,
      targetDuration: duration || 0, // 0 means no specific target
      language: language || "en",
      translateToArabic: translateToArabic || false,
    }).catch((error) => {
      console.error("Error processing audio lecture:", error);
    });

    return NextResponse.json({
      success: true,
      audioLecture: {
        id: audioLecture.id,
        title: audioLecture.title,
        status: audioLecture.status,
      },
      message:
        "Audio lecture generation started. Check the status endpoint to monitor progress.",
    });
  } catch (error) {
    console.error("Error generating audio lecture:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate audio lecture",
      },
      { status: 500 }
    );
  }
}

/**
 * Process audio lecture asynchronously
 */
async function processAudioLecture(audioLectureId, content, config) {
  try {    // Generate lecture script first
    let lectureScript = await generateLectureScript(
      content,
      config.title,
      config.targetDuration,
      config.style,
      config.translateToArabic // Pass the Arabic flag to script generation
    );

    if (config.translateToArabic) {
      console.log("✅ Generated Arabic content directly from OpenAI");
    } else {
      console.log("✅ Generated English content from OpenAI");
    }

    // No need for separate translation step - OpenAI generates in target language directly

    // Update status to indicate script generation is complete
    await prisma.audioLecture.update({
      where: { id: audioLectureId },
      data: {
        status: "generating-audio",
      },
    });

    // Generate audio using Fanar TTS API instead of OpenAI
    const audioBuffer = await fanarAudioService.createSpeech(
      lectureScript,
      config.voice
    );

    // Convert ArrayBuffer to Buffer for blob storage
    const buffer = Buffer.from(audioBuffer);

    // Calculate estimated duration using Fanar service
    const estimatedDurationSeconds = fanarAudioService.estimateDuration(lectureScript);

    // Upload the audio to Vercel Blob storage
    const fileName = `${audioLectureId}-${Date.now()}.mp3`;
    const blob = await put(fileName, buffer, {
      contentType: "audio/mpeg",
      access: "public",
    });

    // Update the audio lecture record with the URL and duration
    await prisma.audioLecture.update({
      where: { id: audioLectureId },
      data: {
        audioUrl: blob.url,
        duration: estimatedDurationSeconds,
        status: "ready",
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error processing audio lecture:", error);

    // Update the status to error
    await prisma.audioLecture.update({
      where: { id: audioLectureId },
      data: { status: "error" },
    });

    return { success: false, error: error.message };
  }
}

/**
 * Generate a lecture script using OpenAI
 */
async function generateLectureScript(content, title, targetDuration, style, generateInArabic = false) {
  // Truncate content if it's too long (OpenAI has token limits)
  const truncatedContent =
    content.length > 10000 ? content.substring(0, 10000) + "..." : content;

  // Adjust prompt based on target duration - make it shorter for TTS reliability
  let durationInstructions = generateInArabic
    ? "يجب أن تكون المحاضرة 3-5 دقائق عند القراءة بصوت عالٍ (حوالي 300-500 كلمة)"
    : "The total lecture should be 3-5 minutes when read aloud (approximately 400-600 words)";

  if (targetDuration > 0) {
    // For TTS, target shorter content to avoid timeouts
    const targetWords = Math.min(500, Math.round(targetDuration * (120 / 60))); // 120 words/min for Arabic
    if (generateInArabic) {
      durationInstructions = `يجب أن تكون المحاضرة حوالي ${Math.min(targetDuration, 300)} ثانية عند القراءة (حوالي ${targetWords} كلمة)`;
    } else {
      durationInstructions = `The total lecture should be approximately ${Math.min(targetDuration, 300)} seconds when read aloud (target around ${targetWords} words)`;
    }
  }
  // Style-specific instructions
  let styleInstructions = "";
  if (generateInArabic) {
    switch (style) {
      case "conversational":
        styleInstructions = "استخدم نبرة ودودة ومحادثة كما لو كنت تتحدث مباشرة إلى طالب.";
        break;
      case "formal":
        styleInstructions = "استخدم نبرة أكاديمية رسمية مناسبة للتعليم الجامعي.";
        break;
      case "enthusiastic":
        styleInstructions = "استخدم نبرة متحمسة وجذابة للحفاظ على اهتمام المستمع.";
        break;
      case "gentle":
        styleInstructions = "استخدم نبرة هادئة ولطيفة مناسبة للتعلم المريح.";
        break;
      default:
        styleInstructions = "استخدم نبرة تعليمية واضحة ومهنية.";
    }
  } else {
    switch (style) {
      case "conversational":
        styleInstructions = "Use a conversational, friendly tone as if speaking directly to a student.";
        break;
      case "formal":
        styleInstructions = "Use a formal, academic tone suitable for university-level education.";
        break;
      case "enthusiastic":
        styleInstructions = "Use an enthusiastic, engaging tone to maintain listener interest.";
        break;
      case "gentle":
        styleInstructions = "Use a gentle, calm tone suitable for relaxed learning.";
        break;
      default:
        styleInstructions = "Use a clear, professional teaching tone.";
    }
  }
  // Create language-specific prompts
  const prompt = generateInArabic ? `
    بناءً على المواد الدراسية التالية، قم بإنشاء نص محاضرة صوتية تعليمية وجذابة.

    المواد الدراسية:
    ${truncatedContent}

    المتطلبات:
    1. يجب أن تكون المحاضرة بعنوان: ${title}
    2. قم بإنشاء شرح واضح ومحادث للمادة
    3. رتب المحتوى بشكل منطقي مع انتقالات واضحة
    4. ركز على المفاهيم والنقاط الأساسية الأهم
    5. اشمل ملاحظات تمهيدية وختامية موجزة
    6. استخدم جمل قصيرة نسبياً للحصول على نتائج أفضل في تحويل النص إلى كلام
    7. تجنب الرموز المعقدة أو الترميزات التي لا تعمل بشكل جيد في الكلام
    8. استخدم لغة بسيطة وواضحة مناسبة للعرض الصوتي
    9. ${durationInstructions}
    10. ${styleInstructions}
    
    مهم: اجعل الناتج النهائي موجزاً ومنظماً بشكل جيد لتحويله إلى صوت.
  ` : `
    Based on the following study material, create an engaging lecture script.

    Study Material:
    ${truncatedContent}

    Requirements:
    1. The lecture should be titled: ${title}
    2. Create a conversational, clear explanation of the material
    3. Structure the content logically with clear transitions
    4. Focus on the most important concepts and key points
    5. Include brief introductory and concluding remarks
    6. Keep sentences relatively short for better text-to-speech results
    7. Avoid complex symbols or notations that wouldn't work well in speech
    8. Use simple, clear language suitable for audio presentation
    9. ${durationInstructions}
    10. ${styleInstructions}
    
    IMPORTANT: Keep the final output concise and well-structured for audio conversion.
  `;
  try {
    const systemMessage = generateInArabic 
      ? "أنت مُعلم محترف تقوم بإنشاء محاضرات صوتية جذابة ومفيدة بناءً على المواد الدراسية. يجب أن تقوم بإنشاء المحتوى باللغة العربية مباشرة."
      : "You are a professional educator creating engaging and informative audio lectures based on study materials.";

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemMessage,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1200, // Reduced to generate shorter content
    });

    const lectureScript = response.choices[0].message.content.trim();
    return lectureScript;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error(`Failed to generate lecture script: ${error.message}`);
  }
}
