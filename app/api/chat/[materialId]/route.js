import { NextResponse } from 'next/server';
import { prisma } from '@/utils/database';
import chatRAGService from '@/utils/ChatRAGService';

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
    });

    return NextResponse.json({
      success: true,
      chats: chats.map(chat => ({
        id: chat.id,
        title: chat.title,
        description: chat.description,
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
    const { title, description } = await request.json();

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
    }

    // Initialize RAG service for this material if not already done
    try {
      await chatRAGService.initializeMaterial(materialId, material.rawContent);
    } catch (ragError) {
      console.error('RAG initialization error:', ragError);
      return NextResponse.json(
        { success: false, error: 'Failed to initialize chat system' },
        { status: 500 }
      );
    }

    // Create new chat
    const chat = await prisma.chat.create({
      data: {
        title: title || `Chat - ${new Date().toLocaleDateString()}`,
        description,
        materialId
      }
    });

    return NextResponse.json({
      success: true,
      chat: {
        id: chat.id,
        title: chat.title,
        description: chat.description,
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
