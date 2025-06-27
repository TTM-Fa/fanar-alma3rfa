import { NextResponse } from "next/server";
import { prisma } from "@/utils/database";
import { filterContentByTopics } from "@/utils/fileProcessors";
import QuizGenerator from "@/utils/QuizGenerator";

// Initialize QuizGenerator with Fanar API
const quizGenerator = new QuizGenerator(process.env.FANAR_API_KEY, {
  apiUrl: "https://api.fanar.qa/v1/chat/completions",
  model: "Fanar-S-1-7B",
  maxInputTokens: 2500,
  maxCompletionTokens: 1000,
  requestDelay: 1500,
  temperature: 0.3
});

export async function POST(request) {
  try {    const { materialId, numQuestions, difficulty, questionType, selectedTopics, translateToArabic } =
      await request.json();

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
          error: "Material does not have any content to generate a quiz from",
        },
        { status: 400 }
      );
    }

    // Set default parameters
    const quizParams = {
      numQuestions: numQuestions || 5,
      difficulty: difficulty || "medium",
      questionType: questionType || "multiple-choice",    };    console.log(`📖 Content length: ${material.rawContent.length} characters`);
    console.log(`🎯 Quiz params: ${numQuestions} questions, ${difficulty} difficulty, ${questionType} type${translateToArabic ? ', Arabic translation enabled' : ''}`);

    // Filter content by selected topics if any topics are specified
    let contentToProcess = material.rawContent;
    if (selectedTopics && selectedTopics.length > 0) {
      console.log(
        `🎯 Filtering content by ${
          selectedTopics.length
        } selected topics: ${selectedTopics.join(", ")}`
      );
      contentToProcess = filterContentByTopics(
        material.rawContent,
        selectedTopics
      );
      console.log(
        `📖 Filtered content length: ${
          contentToProcess.length
        } characters (${Math.round(
          (contentToProcess.length / material.rawContent.length) * 100
        )}% of original)`
      );

      if (contentToProcess.length < 100) {
        return NextResponse.json(
          {
            success: false,
            error: "Selected topics resulted in too little content to generate meaningful quiz questions. Please select additional topics or try without topic filtering.",
          },
          { status: 400 }
        );
      }
    }    // Generate quiz questions using Fanar API with smart chunking
    const result = await quizGenerator.generateQuestionsWithTranslation(
      contentToProcess,
      quizParams.numQuestions,
      {
        difficulty: quizParams.difficulty,
        questionType: quizParams.questionType
      },
      { translateToArabic }
    );

    // Extract questions from the result
    const questions = result.questions;

    // Create the quiz in the database
    const quiz = await prisma.quiz.create({
      data: {
        title: `Quiz on ${material.title || "Study Material"}`,
        description: `A ${quizParams.difficulty} difficulty quiz with ${quizParams.numQuestions} ${quizParams.questionType} questions.`,
        difficulty: quizParams.difficulty,
        materialId: material.id,
        questions: {
          create: questions,
        },
      },
      include: {
        questions: true,
      },
    });    return NextResponse.json({
      success: true,
      quiz,
    });
  } catch (error) {
    console.error("Error generating quiz:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate quiz",
      },
      { status: 500 }
    );
  }
}
