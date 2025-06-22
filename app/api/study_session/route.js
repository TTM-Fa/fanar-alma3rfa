import { prisma } from "@/utils/database";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
      // Fetch specific study session with its materials
      const session = await prisma.studySession.findUnique({
        where: { id: sessionId },
        include: {
          materials: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

      if (!session) {
        return NextResponse.json(
          {
            success: false,
            error: "Study session not found",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        session,
      });
    } else {
      // Fetch all study sessions with their materials count
      const sessions = await prisma.studySession.findMany({
        include: {
          materials: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      // Transform the data to include material counts
      const formattedSessions = sessions.map((session) => ({
        id: session.id,
        title: session.title,
        subject: session.subject,
        description: session.description,
        materialsCount: session.materials.length,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      }));

      return NextResponse.json({
        success: true,
        data: formattedSessions,
      });
    }
  } catch (error) {
    console.error("Failed to fetch study session(s):", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch study session(s)",
      },
      { status: 500 }
    );
  }
}
