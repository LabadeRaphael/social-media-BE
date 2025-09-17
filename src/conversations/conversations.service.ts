import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationDto } from './dto/conversations.dto';

@Injectable()
export class ConversationService {
  constructor(private prisma: PrismaService) {}

  async createConversation(conversation: ConversationDto) {
    // check if conversation between these two users already exists
    const existing = await this.prisma.conversation.findFirst({
      where: {
        participants: {
          every: {
            id: { in: conversation.participants },
          },
        },
      },
      include: {
        participants: {
          select: { id: true, email: true, userName: true },
        },
      },
    });

    if (existing) {
      return existing; // return existing conversation instead of creating a new one
    }
  
    return this.prisma.conversation.create({
      data: {
        participants: {
          connect: conversation.participants.map((id) => ({ id })),
        },
      },
      include: { 
        participants:{
          select:{
            id: true,
            email: true,
            userName: true,
            createdAt: true,
          }
        }
      },
    });
  }

  async getUserConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        participants: {
          some: { id: userId },
        },
      },
      include: {
        participants:{
          select: {
            id: true,
            email: true,
            userName: true,
            createdAt: true,
          }
        },
        lastMessage: true,
      },
    });
  }

  async getConversation(conversationId: string) {
    return this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants:{
          select: { id: true, email: true, userName: true },
        },
        messages: {
          select: { id: true, text: true, createdAt: true, senderId: true },
          orderBy: { createdAt: 'asc' },
        },
        lastMessage: {
          select: { id: true, text: true, createdAt: true, senderId: true },
        },
      },
    });
  }
  // conversation.service.ts
async getMessages(conversationId: string, skip: number, take: number) {
  return this.prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' }, // latest first
    skip,
    take,
    select: {
      id: true,
      text: true,
      createdAt: true,
      sender: { select: { id: true, userName: true, email: true } },
    },
  });
}

}
