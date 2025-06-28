import { NextRequest, NextResponse } from "next/server";
import axios from 'axios';
import { put } from '@vercel/blob';

export async function POST(request) {
  try {
    const { text, saveToStorage = false } = await request.json();
    
    if (!text) {
      return NextResponse.json(
        { success: false, error: "No text provided" },
        { status: 400 }
      );
    }

    // Validate text length
    if (text.length > 4000) {
      return NextResponse.json(
        { success: false, error: "Text too long (max 4000 characters)" },
        { status: 400 }
      );
    }

    const FANAR_API_KEY = process.env.FANAR_API_KEY;
    if (!FANAR_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Fanar API key not configured" },
        { status: 500 }
      );
    }

    console.log('TTS request:', { 
      textLength: text.length, 
      saveToStorage,
      textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : '')
    });

    // Enhanced retry logic for TTS API
    let response;
    let attempts = 0;
    const maxAttempts = 3;
    const baseDelay = 1000;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`TTS attempt ${attempts}/${maxAttempts}`);

        // Create axios instance with enhanced configuration
        const axiosConfig = {
          headers: {
            'Authorization': `Bearer ${FANAR_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg, audio/wav, audio/*',
            'User-Agent': 'Fanar-Alma3rfa/1.0'
          },
          responseType: 'arraybuffer',
          timeout: 45000, // 45 second timeout
          maxContentLength: 100 * 1024 * 1024, // 100MB max response
          maxBodyLength: 10 * 1024 * 1024, // 10MB max request
          // Enable retries on network errors
          validateStatus: (status) => status < 500, // Don't throw on 4xx errors
          // Add connection pooling
          maxRedirects: 3,
          // Enable keep-alive
          httpAgent: new (require('http').Agent)({ keepAlive: true }),
          httpsAgent: new (require('https').Agent)({ keepAlive: true }),
        };

        // Make the API request
        response = await axios.post('https://api.fanar.qa/v1/audio/speech', {
          model: 'Fanar-Aura-TTS-1',
          input: text.trim(),
          voice: 'default',
          response_format: 'mp3', // Explicitly request MP3 format
          speed: 1.0 // Normal speed
        }, axiosConfig);

        // Check if response is successful
        if (response.status >= 400) {
          throw new Error(`API returned status ${response.status}: ${response.statusText}`);
        }

        // Validate response data
        if (!response.data || response.data.length === 0) {
          throw new Error('Empty response from TTS API');
        }

        console.log('TTS success:', { 
          status: response.status,
          dataSize: response.data.length,
          contentType: response.headers['content-type']
        });
        
        break; // Success, exit retry loop

      } catch (attemptError) {
        console.error(`TTS attempt ${attempts} failed:`, {
          message: attemptError.message,
          code: attemptError.code,
          status: attemptError.response?.status,
          statusText: attemptError.response?.statusText,
          url: attemptError.config?.url
        });

        // If this is the final attempt, throw the error
        if (attempts === maxAttempts) {
          // Provide more specific error messages
          if (attemptError.code === 'ECONNRESET' || attemptError.code === 'ENOTFOUND') {
            throw new Error('Network connection failed. Please check your internet connection and try again.');
          } else if (attemptError.code === 'ETIMEDOUT') {
            throw new Error('Request timed out. The TTS service may be temporarily unavailable.');
          } else if (attemptError.response?.status === 401) {
            throw new Error('Invalid API key. Please check your Fanar API configuration.');
          } else if (attemptError.response?.status === 429) {
            throw new Error('Rate limit exceeded. Please try again in a moment.');
          } else if (attemptError.response?.status >= 500) {
            throw new Error('TTS service is temporarily unavailable. Please try again later.');
          } else {
            throw attemptError; // Re-throw original error
          }
        }

        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempts - 1);
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // If saveToStorage is true, upload to Vercel Blob and return URL
    if (saveToStorage) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json(
          { success: false, error: "Blob storage not configured" },
          { status: 500 }
        );
      }

      try {
        // Generate unique filename for AI response
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const filename = `ai-responses/assistant-${timestamp}-${randomId}.mp3`;

        console.log('Uploading to blob storage:', filename);

        // Upload to Vercel Blob storage
        const blob = await put(filename, Buffer.from(response.data), {
          access: 'public',
          contentType: 'audio/mpeg',
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        console.log('Blob upload success:', blob.url);

        return NextResponse.json({
          success: true,
          audioUrl: blob.url,
          metadata: {
            size: response.data.length,
            duration: Math.ceil(text.length / 20), // Rough estimate: 20 chars per second
            format: 'mp3'
          }
        });
      } catch (blobError) {
        console.error('Blob storage error:', blobError);
        // Still return the audio data even if blob storage fails
        return new NextResponse(response.data, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': response.data.length.toString(),
            'X-Warning': 'Blob storage failed, returning direct audio'
          },
        });
      }
    }

    // Return the audio data as a blob (for immediate playback)
    return new NextResponse(response.data, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': response.data.length.toString(),
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'X-Audio-Generated': 'true'
      },
    });

  } catch (error) {
    console.error("Speech synthesis error:", error);
    
    // Return a user-friendly error message
    const errorMessage = error.message || "Speech synthesis failed";
    const statusCode = error.response?.status === 401 ? 401 : 
                      error.response?.status === 429 ? 429 : 500;

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        code: error.code,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );
  }
}
