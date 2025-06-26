import { NextResponse } from "next/server";
import { prisma } from "@/utils/database";

export async function DELETE(request, { params }) {
  const { materialId } = await params;

  try {
    // Check if the material exists
    const material = await prisma.material.findUnique({
      where: { id: materialId },
    });

    if (!material) {
      return NextResponse.json(
        { success: false, error: "Material not found" },
        { status: 404 }
      );
    }

    // Delete the material from the database
    await prisma.material.delete({
      where: { id: materialId },
    });

    return NextResponse.json({
      success: true,
      message: "Material deleted successfully",
      materialId: materialId,
    });
  } catch (error) {
    console.error("Error deleting material:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
