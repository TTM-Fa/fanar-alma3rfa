import { NextResponse } from "next/server";
import { prisma } from "@/utils/database";

export async function GET(request, { params }) {
  const { quizId } = await params;

  if (!quizId) {
    return NextResponse.json(
      { success: false, error: "Quiz ID is required" },
      { status: 400 }
    );
  }

  try {
    // Fetch the quiz with its questions
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: true,
        material: {
          select: {
            id: true,
            title: true,
            type: true,
            fileName: true,
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json(
        { success: false, error: "Quiz not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      quiz: quiz,
    });
  } catch (error) {
    console.error("Error fetching quiz:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch quiz" },
      { status: 500 }
    );
  }
}
