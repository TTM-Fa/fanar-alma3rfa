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
    }

    return NextResponse.json({
      success: true,
      chat: {
        id: chat.id,
        title: chat.title,
        description: chat.description,
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
    const { question } = await request.json();

    if (!question || !question.trim()) {
      return NextResponse.json(
        { success: false, error: 'Question is required' },
        { status: 400 }
      );
    }

    // Get chat with material and recent messages
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        material: true,
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
    }

    // Ensure material is initialized in RAG service
    if (!chat.material.rawContent) {
      return NextResponse.json(
        { success: false, error: 'Material content not available' },
        { status: 400 }
      );
    }

    try {
      await chatRAGService.initializeMaterial(chat.materialId, chat.material.rawContent);
    } catch (ragError) {
      console.error('RAG initialization error:', ragError);
    }

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        content: question.trim(),
        role: 'user',
        chatId
      }
    });

    // Prepare chat history for context
    const chatHistory = chat.messages
      .reverse() // Get in chronological order
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));

    // Process question with RAG
    let answer, references;
    try {
      const result = await chatRAGService.processQuestion(
        chat.materialId,
        question.trim(),
        chatHistory
      );
      answer = result.answer;
      references = result.references;
    } catch (ragError) {
      console.error('RAG processing error:', ragError);
      answer = 'I apologize, but I encountered an error while processing your question. Please try again.';
      references = [];
    }

    // Save assistant message
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        content: answer,
        role: 'assistant',
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
