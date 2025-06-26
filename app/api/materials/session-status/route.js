import { NextResponse } from "next/server";
import { prisma } from "@/utils/database";
import OpenAI from "openai";
import { getFileProcessor } from "@/utils/fileProcessors";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Get all materials for this session
    const materials = await prisma.material.findMany({
      where: {
        studySessionId: sessionId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Check batch status for materials that have batchId and are still processing
    const processingMaterials = materials.filter(
      (material) =>
        material.batchId &&
        ["Processing", "Converting to text", "Batch Created"].includes(
          material.status
        )
    );

    console.log(
      `Found ${processingMaterials.length} materials with active batches`
    );

    // Process batch status updates
    for (const material of processingMaterials) {
      try {
        console.log(
          `Checking batch status for material ${material.id}, batchId: ${material.batchId}`
        );

        // Check the batch status with OpenAI
        const batch = await openai.batches.retrieve(material.batchId);
        console.log(`Batch ${material.batchId} status: ${batch.status}`);

        if (batch.status === "completed") {
          // Process the completed batch
          await processCompletedBatch(material, batch);
        } else if (
          batch.status === "failed" ||
          batch.status === "expired" ||
          batch.status === "cancelled"
        ) {
          // Handle failed batches
          await prisma.material.update({
            where: { id: material.id },
            data: {
              status: "Error",
              batchId: null,
            },
          });
        }
      } catch (error) {
        console.error(
          `Error checking batch for material ${material.id}:`,
          error
        );

        // If we can't check the batch status, mark as error
        await prisma.material.update({
          where: { id: material.id },
          data: {
            status: "Error",
            batchId: null,
          },
        });
      }
    }

    // Fetch updated materials after batch processing
    const updatedMaterials = await prisma.material.findMany({
      where: {
        studySessionId: sessionId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform materials to include progress information
    const materialsWithStatus = updatedMaterials.map((material) => {
      const statusMap = {
        uploaded: 25,
        pending: 30,
        "Not Found": 50,
        Processing: 75,
        "Converting to text": 80,
        "Batch Created": 70,
        "Skimming Through": 85,
        Summarizing: 95,
        Ready: 100,
        Error: 0,
        error: 0,
        unsupported: 0,
      };

      const progress = statusMap[material.status] || 50;
      const phase = progress === 100 ? 4 : Math.floor(progress / 25);

      return {
        ...material,
        progress,
        phase,
        hasError: ["Error", "error", "unsupported"].includes(material.status),
        isReady: ["Ready", "ready"].includes(material.status),
        isProcessing: [
          "uploaded",
          "pending",
          "Processing",
          "Converting to text",
          "Batch Created",
          "Skimming Through",
          "Summarizing",
        ].includes(material.status),
      };
    });

    return NextResponse.json({
      success: true,
      materials: materialsWithStatus,
      processingCount: materialsWithStatus.filter((m) => m.isProcessing).length,
      errorCount: materialsWithStatus.filter((m) => m.hasError).length,
      readyCount: materialsWithStatus.filter((m) => m.isReady).length,
    });
  } catch (error) {
    console.error("Error in session status check:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function processCompletedBatch(material, batch) {
  try {
    console.log(`Processing completed batch for material ${material.id}`);

    // Update status to indicate we're processing the results
    await prisma.material.update({
      where: { id: material.id },
      data: { status: "Skimming Through" },
    });

    // Download the batch results
    const outputFileResponse = await fetch(
      `https://api.openai.com/v1/files/${batch.output_file_id}/content`,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    if (!outputFileResponse.ok) {
      throw new Error(
        `Failed to download batch results: ${outputFileResponse.status}`
      );
    }

    const outputContent = await outputFileResponse.text();
    const results = outputContent
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));

    console.log(`Processing ${results.length} batch results`);

    // Use the existing processBatchResults method from PdfProcessor
    const processor = getFileProcessor("application/pdf");
    await processor.processBatchResults(material, results, prisma);

    // Update status to ready
    await prisma.material.update({
      where: { id: material.id },
      data: {
        status: "Ready",
        batchId: null,
      },
    });

    console.log(`Completed processing for material ${material.id}`);
  } catch (error) {
    console.error(
      `Error processing completed batch for material ${material.id}:`,
      error
    );

    // Mark as error
    await prisma.material.update({
      where: { id: material.id },
      data: {
        status: "Error",
        batchId: null,
      },
    });

    throw error;
  }
}
