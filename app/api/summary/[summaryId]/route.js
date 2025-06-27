import { NextResponse } from "next/server";
import { prisma } from "@/utils/database";

export async function GET(request, { params }) {
  const { summaryId } = await params;

  if (!summaryId) {
    return NextResponse.json(
      { success: false, error: "Summary ID is required" },
      { status: 400 }
    );
  }

  try {
    // Find the summary
    const summary = await prisma.summary.findUnique({
      where: { id: summaryId },
      include: {
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

    if (!summary) {
      return NextResponse.json(
        { success: false, error: "Summary not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("Error fetching summary:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch summary" },
      { status: 500 }
    );
  }
}
