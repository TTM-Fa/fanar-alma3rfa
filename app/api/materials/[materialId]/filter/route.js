// app/api/materials/[materialId]/filter/route.js
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getFilteredMaterialContent } from "@/utils/topicFilter.js";

const prisma = new PrismaClient();

export async function POST(request, { params }) {
  try {
    const { materialId } = params;
    const { topics, exactMatch = false } = await request.json();

    // Validate input
    if (!materialId) {
      return NextResponse.json(
        { error: "Material ID is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(topics)) {
      return NextResponse.json(
        { error: "Topics must be an array" },
        { status: 400 }
      );
    }

    // Fetch the material from database
    const material = await prisma.material.findUnique({
      where: { id: materialId },
      select: {
        id: true,
        title: true,
        description: true,
        rawContent: true,
        topics: true,
        status: true,
      },
    });

    if (!material) {
      return NextResponse.json(
        { error: "Material not found" },
        { status: 404 }
      );
    }

    if (material.status !== "Ready") {
      return NextResponse.json(
        { error: "Material is not ready for filtering" },
        { status: 400 }
      );
    }

    // Get filtered content
    const result = getFilteredMaterialContent(material, topics, exactMatch);

    return NextResponse.json({
      success: true,
      materialId: material.id,
      title: material.title,
      description: material.description,
      filteredContent: result.content,
      availableTopics: result.availableTopics,
      selectedTopics: result.selectedTopics,
      statistics: result.statistics,
      originalStatistics: result.originalStatistics,
    });
  } catch (error) {
    console.error("Error filtering material content:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { materialId } = params;

    // Validate input
    if (!materialId) {
      return NextResponse.json(
        { error: "Material ID is required" },
        { status: 400 }
      );
    }

    // Fetch the material from database
    const material = await prisma.material.findUnique({
      where: { id: materialId },
      select: {
        id: true,
        title: true,
        description: true,
        topics: true,
        status: true,
        rawContent: true,
      },
    });

    if (!material) {
      return NextResponse.json(
        { error: "Material not found" },
        { status: 404 }
      );
    }

    // Get available topics and statistics
    const result = getFilteredMaterialContent(material, []);

    return NextResponse.json({
      success: true,
      materialId: material.id,
      title: material.title,
      description: material.description,
      availableTopics: result.availableTopics,
      databaseTopics: material.topics || [],
      statistics: result.statistics,
      status: material.status,
    });
  } catch (error) {
    console.error("Error getting material topics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}