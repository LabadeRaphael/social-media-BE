import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationService {
  constructor(private prisma: PrismaService) {}

  async createConversation(userId: string, otherUserId: string) {
    return this.prisma.conversation.create({
      data: {
        participants: {
          connect: [{ id: userId }, { id: otherUserId }],
        },
      },
    });
  }

//   async getUserConversations(userId: string) {
//     return this.prisma.conversation.findMany({
//       where: {
//         participants: {
//           some: { id: userId },
//         },
//       },
//       include: {
//         participants: true,
//         lastMessage: true,
//       },
//     });
//   }

//   async getConversation(conversationId: string) {
//     return this.prisma.conversation.findUnique({
//       where: { id: conversationId },
//       include: {
//         participants: true,
//         messages: {
//           orderBy: { createdAt: 'asc' },
//         },
//       },
//     });
//   }
}
