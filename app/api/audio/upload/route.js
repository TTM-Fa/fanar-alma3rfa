import { NextRequest, NextResponse } from "next/server";
import { put } from '@vercel/blob';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio');
    const messageId = formData.get('messageId');
    
    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Check for Vercel Blob token
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { success: false, error: "Blob storage not configured" },
        { status: 500 }
      );
    }

    // Convert file to buffer
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = audioFile.name?.split('.').pop() || 'webm';
    const filename = `voice-messages/${messageId || timestamp}-${Date.now()}.${fileExtension}`;

    // Upload to Vercel Blob storage
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: audioFile.type || 'audio/webm',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({
      success: true,
      audioUrl: blob.url
    });

  } catch (error) {
    console.error("Audio upload error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Audio upload failed" 
      },
      { status: 500 }
    );
  }
}
