import { NextResponse } from "next/server";
import { prisma } from "@/utils/database";

export async function GET(request) {
  // Extract query parameters
  const searchParams = new URL(request.url).searchParams;
  const fileName = searchParams.get("fileName");
  const sessionId = searchParams.get("sessionId");

  if (!fileName || !sessionId) {
    return NextResponse.json(
      { success: false, error: "fileName and sessionId are required" },
      { status: 400 }
    );
  }

  try {
    console.log(
      `Looking up material with fileName ${fileName} in session ${sessionId}`
    );

    // Find the most recently created material with this filename in the session
    const material = await prisma.material.findFirst({
      where: {
        fileName: fileName,
        studySessionId: sessionId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!material) {
      console.log(
        `No material found with fileName ${fileName} in session ${sessionId}`
      );
      return NextResponse.json(
        { success: false, error: "Material not found" },
        { status: 404 }
      );
    }

    console.log(`Found material with ID: ${material.id}`);
    return NextResponse.json({
      success: true,
      materialId: material.id,
      material: {
        id: material.id,
        title: material.title,
        status: material.status,
        createdAt: material.createdAt,
      },
    });
  } catch (error) {
    console.error("Error retrieving material:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
