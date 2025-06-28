import { NextResponse } from 'next/server';
import { prisma } from '@/utils/database';
import chatRAGService from '@/utils/ChatRAGService';

// GET /api/chat/messages/[chatId] - Get all messages for a chat
export async function GET(request, { params }) {
  try {
    const { chatId } = await params;

    // Verify chat exists
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        material: true
      }
    });

    if (!chat) {
      return NextResponse.json(
        { success: false, error: 'Chat not found' },
        { status: 404 }
      );
    }    return NextResponse.json({
      success: true,
      chat: {
        id: chat.id,
        title: chat.title,
        description: chat.description,
        language: chat.language,
        materialId: chat.materialId,
        materialTitle: chat.material.title
      },
      messages: chat.messages
    });

  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chat messages' },
      { status: 500 }
    );
  }
}

// POST /api/chat/messages/[chatId] - Send a message in a chat
export async function POST(request, { params }) {
  try {
    const { chatId } = await params;
    const requestData = await request.json();
    
    // Handle both voice and text messages
    const { question, isVoiceMessage, audioUrl, transcription } = requestData;
    
    // Determine the message content and type
    let messageContent, messageType;
    if (isVoiceMessage) {
      messageContent = transcription || '';
      messageType = 'voice';
    } else {
      messageContent = question;
      messageType = 'text';
    }

    // Ensure we have valid content
    const contentText = typeof messageContent === 'string' ? messageContent : String(messageContent || '');
    
    if (!contentText || !contentText.trim()) {
      return NextResponse.json(
        { success: false, error: 'Message content is required' },
        { status: 400 }
      );
    }    // Get chat with material and recent messages
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        material: {
          select: {
            id: true,
            title: true,
            rawContent: true,
            translatedContent: true, // Include translated content
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10 // Get last 10 messages for context
        }
      }
    });

    if (!chat) {
      return NextResponse.json(
        { success: false, error: 'Chat not found' },
        { status: 404 }
      );
    }    // Ensure material is initialized in RAG service with correct content
    if (!chat.material.rawContent) {
      return NextResponse.json(
        { success: false, error: 'Material content not available' },
        { status: 400 }
      );
    }

    // Use appropriate content based on chat language
    let contentToUse = chat.material.rawContent;
    if (chat.language === 'ar' && chat.material.translatedContent) {
      contentToUse = chat.material.translatedContent;
      console.log('Using Arabic translated content for RAG');
    } else if (chat.language === 'ar') {
      console.log('Arabic chat but no translated content available, using original');
    }

    try {
      await chatRAGService.initializeMaterial(chat.materialId, contentToUse, chat.language || 'en');
    } catch (ragError) {
      console.error('RAG initialization error:', ragError);
    }// Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        content: contentText.trim(),
        role: 'user',
        messageType: messageType,
        audioUrl: audioUrl || null,
        transcription: messageType === 'voice' ? contentText.trim() : null,
        chatId
      }
    });

    // Prepare chat history for context
    const chatHistory = chat.messages
      .reverse() // Get in chronological order
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));    // Process question with RAG using chat language
    let answer, references, assistantAudioUrl;
    try {
      const result = await chatRAGService.processQuestion(
        chat.materialId,
        contentText.trim(),
        chatHistory,
        chat.language || 'en'
      );
      answer = result.answer;
      references = result.references;// If user sent voice message, generate audio response
      if (messageType === 'voice') {
        try {
          const ttsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/audio/synthesize`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              text: answer,
              saveToStorage: true 
            }),
          });

          if (ttsResponse.ok) {
            const ttsData = await ttsResponse.json();
            if (ttsData.success) {
              assistantAudioUrl = ttsData.audioUrl;
            }
          }
        } catch (ttsError) {
          console.error('TTS generation error:', ttsError);
        }
      }

    } catch (ragError) {
      console.error('RAG processing error:', ragError);
      answer = 'I apologize, but I encountered an error while processing your question. Please try again.';
      references = [];
    }    // Save assistant message
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        content: answer,
        role: 'assistant',
        messageType: messageType === 'voice' ? 'voice' : 'text',
        audioUrl: assistantAudioUrl || null,
        chatId
      }
    });

    // Update chat timestamp
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      userMessage,
      assistantMessage,
      references
    });

  } catch (error) {
    console.error('Error processing chat message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
