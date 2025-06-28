import { NextResponse } from 'next/server';
import { prisma } from '@/utils/database';
import chatRAGService from '@/utils/ChatRAGService';
import axios from 'axios';

// GET /api/chat/[materialId] - Get all chats for a material
export async function GET(request, { params }) {
  try {
    const { materialId } = await params;

    // Verify material exists
    const material = await prisma.material.findUnique({
      where: { id: materialId }
    });

    if (!material) {
      return NextResponse.json(
        { success: false, error: 'Material not found' },
        { status: 404 }
      );
    }

    // Fetch chats for this material
    const chats = await prisma.chat.findMany({
      where: { materialId },
      include: {
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });    return NextResponse.json({
      success: true,
      chats: chats.map(chat => ({
        id: chat.id,
        title: chat.title,
        description: chat.description,
        language: chat.language,
        messageCount: chat._count.messages,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }))
    });

  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chats' },
      { status: 500 }
    );
  }
}

// POST /api/chat/[materialId] - Create a new chat
export async function POST(request, { params }) {
  try {
    const { materialId } = await params;
    const { title, description, language = 'en' } = await request.json();

    // Validate language
    if (!['en', 'ar'].includes(language)) {
      return NextResponse.json(
        { success: false, error: 'Language must be either "en" or "ar"' },
        { status: 400 }
      );
    }

    // Verify material exists and is ready
    const material = await prisma.material.findUnique({
      where: { id: materialId }
    });

    if (!material) {
      return NextResponse.json(
        { success: false, error: 'Material not found' },
        { status: 404 }
      );
    }

    if (!material.rawContent) {
      return NextResponse.json(
        { success: false, error: 'Material content not available' },
        { status: 400 }
      );
    }    // If Arabic language is selected, ensure content is translated
    let contentToUse = material.rawContent;
    if (language === 'ar') {
      // Check if we already have translated content
      if (material.translatedContent) {
        console.log('Using existing Arabic translation');
        contentToUse = material.translatedContent;
      } else {
        console.log('Translating content to Arabic...');
        try {
          // Use axios for server-side API call
          const translationResponse = await axios.post(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/translate`, {
            text: material.rawContent,
            targetLanguage: 'ar',
            sourceLanguage: 'auto'
          }, {
            headers: {
              'Content-Type': 'application/json',
            }
          });

          if (translationResponse.data.success) {
            contentToUse = translationResponse.data.translatedText;
            
            // Save translated content to database for future use
            await prisma.material.update({
              where: { id: materialId },
              data: { translatedContent: contentToUse }
            });
            
            console.log('Content translated and saved to database');
          } else {
            console.warn('Translation failed, using original content:', translationResponse.data.error);
          }
        } catch (translationError) {
          console.warn('Translation error, using original content:', translationError.message);
        }
      }
    }

    // Initialize RAG service for this material with appropriate content
    try {
      await chatRAGService.initializeMaterial(materialId, contentToUse, language);
    } catch (ragError) {
      console.error('RAG initialization error:', ragError);
      return NextResponse.json(
        { success: false, error: 'Failed to initialize chat system' },
        { status: 500 }
      );
    }

    // Create new chat with language
    const chat = await prisma.chat.create({
      data: {
        title: title || `Chat - ${new Date().toLocaleDateString()}`,
        description,
        language,
        materialId
      }
    });

    return NextResponse.json({
      success: true,
      chat: {
        id: chat.id,
        title: chat.title,
        description: chat.description,
        language: chat.language,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }
    });

  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create chat' },
      { status: 500 }
    );
  }
}
