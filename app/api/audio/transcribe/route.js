import { NextRequest, NextResponse } from "next/server";
import OpenAI from 'openai';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio');
    const language = formData.get('language') || 'auto'; // Get language parameter
    
    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: "No audio file provided" },
        { status: 400 }
      );
    }    console.log('Transcription request - File size:', audioFile.size, 'bytes');
    console.log('Transcription request - File type:', audioFile.type);
    console.log('Transcription request - File name:', audioFile.name);
    console.log('Transcription request - Language:', language);

    // Check if file is too small (likely no audio recorded)
    if (audioFile.size < 1000) { // Less than 1KB
      return NextResponse.json(
        { success: false, error: "Audio file too small - no speech detected" },
        { status: 400 }
      );
    }

    // Check if file is too large (25MB Whisper limit)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "Audio file too large (max 25MB)" },
        { status: 400 }
      );
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Convert the file to a buffer
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log('Sending to Whisper - Buffer size:', buffer.length, 'bytes');

    // Create a File object for OpenAI Whisper API
    const audioFileForWhisper = new File([buffer], audioFile.name || 'recording.webm', {
      type: audioFile.type || 'audio/webm'
    });    // Use OpenAI Whisper for transcription with language specification
    const transcriptionConfig = {
      file: audioFileForWhisper,
      model: "whisper-1",
      response_format: "verbose_json", // Get more detailed response
      temperature: 0.0, // More deterministic output
    };

    // Add language parameter if specified (not auto)
    if (language && language !== 'auto') {
      transcriptionConfig.language = language;
      console.log('Using specified language:', language);
    } else {
      console.log('Using auto-detection');
    }

    const transcriptionResponse = await openai.audio.transcriptions.create(transcriptionConfig);console.log('Whisper response:', transcriptionResponse);

    const transcriptionText = transcriptionResponse.text?.trim();
    
    if (!transcriptionText || transcriptionText.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: "No speech detected. Please speak clearly and ensure good microphone access.",
          details: {
            duration: transcriptionResponse.duration,
            language: transcriptionResponse.language
          }
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      transcription: transcriptionText,
      details: {
        language: transcriptionResponse.language,
        duration: transcriptionResponse.duration,
        confidence: transcriptionResponse.segments?.map(s => s.avg_logprob) || []
      }
    });

  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.response?.data?.error || error.message || "Transcription failed" 
      },
      { status: 500 }
    );
  }
}
