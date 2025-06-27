import { NextResponse } from "next/server";
import { prisma } from "@/utils/database";

export async function GET(request, { params }) {
  try {
    const { audioLectureId } = await params;

    if (!audioLectureId) {
      return NextResponse.json(
        { success: false, error: "Audio Lecture ID is required" },
        { status: 400 }
      );
    }

    const audioLecture = await prisma.audioLecture.findUnique({
      where: { id: audioLectureId },
      select: {
        id: true,
        title: true,
        status: true,
        audioUrl: true,
        duration: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!audioLecture) {
      return NextResponse.json(
        { success: false, error: "Audio lecture not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      audioLecture,
    });
  } catch (error) {
    console.error("Error fetching audio lecture status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch audio lecture status",
      },
      { status: 500 }
    );
  }
}
