// pages/api/material/upload.js
import { handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { prisma } from "@/utils/database";
// import { processFile } from "@/utils/fileProcessors";

export async function POST(request) {
  // Extract sessionId from the URL parameter
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json(
      { error: "Session ID is required" },
      { status: 400 }
    );
  }

  const body = await request.json();
  console.log("Request body: ", body);
  console.log("Session ID: ", sessionId);

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: [
            "application/pdf", // Allow PDFs
            "audio/mpeg",
            "audio/mp3",
            "audio/wav", // Common audio formats
            "audio/x-m4a",
            "audio/m4a",
            "audio/mp4",
            "audio/x-wav", // Additional audio formats
          ],
          tokenPayload: JSON.stringify({ sessionId }), // Pass sessionId in token payload
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log("Blob upload completed", blob);

        try {
          // Parse the token payload to get the session ID
          const payload = JSON.parse(tokenPayload || "{}");
          const sessionIdFromToken = payload.sessionId || sessionId;

          // Extract file information from the blob
          const { pathname, size, contentType, url } = blob;
          const type = contentType;

          // Determine if this is an audio file
          const isAudio = type.startsWith("audio/");

          // Create the material in the database with initial status
          const material = await prisma.material.create({
            data: {
              title: pathname.split(".")[0], // Use filename (without extension) as title
              type,
              link: url,
              fileName: pathname, // Extract the file name from the URL
              studySessionId: sessionIdFromToken,
              status: "uploaded", // Initial status before processing
            },
          });

          console.log("Material saved to database", material);

          // Start processing the file asynchronously
          processFile(url, type, {
            materialId: material.id,
            prisma,
          }).catch((error) => {
            console.error(`Error processing material ${material.id}:`, error);
          });

          // Include the materialId in the response explicitly
          return {
            success: true,
            materialId: material.id,
            url: url, // Return the URL too for reference
            message: `${
              isAudio ? "Audio" : "PDF"
            } material created and processing started`,
          };
        } catch (dbError) {
          console.error("Failed to save material to database:", dbError);
          return { success: false, error: dbError.message };
        }
      },
    });

    // Add additional information to the response if needed
    const finalResponse = {
      ...jsonResponse,
      message: "Upload processed successfully",
    };

    console.log("Upload requested successfully: ", finalResponse);
    return NextResponse.json(finalResponse);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
