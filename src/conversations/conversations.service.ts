// import { Injectable } from '@nestjs/common';
// import { PrismaService } from '../prisma/prisma.service';
// import { ConversationDto } from './dto/conversations.dto';

// @Injectable()
// export class ConversationService {
//   constructor(private prisma: PrismaService) {}

//   async createConversation(conversation: ConversationDto) {
//     // check if conversation between these two users already exists
//     const existing = await this.prisma.conversation.findFirst({
//       where: {
//         participants: {
//           every: {
//             id: { in: conversation.participants },
//           },
//         },
//       },
//       include: {
//         participants: {
//           select: { id: true, email: true, userName: true },
//         },
//       },
//     });

//     if (existing) {
//       return existing; // return existing conversation instead of creating a new one
//     }

//     return this.prisma.conversation.create({
//       data: {
//         participants: {
//           connect: conversation.participants.map((id) => ({ id })),
//         },
//       },
//       include: { 
//         participants:{
//           select:{
//             id: true,
//             email: true,
//             userName: true,
//             createdAt: true,
//           }
//         }
//       },
//     });
//   }

//   async getUserConversations(userId?: string) {
//     return this.prisma.conversation.findMany({
//       where: {
//         participants: {
//           some: { id: userId },
//         },
//       },
//       include: {
//         participants:{
//           select: {
//             id: true,
//             email: true,
//             userName: true,
//             createdAt: true,
//           }
//         },
//         lastMessage: true,
//       },
//     });
//   }

//   async getConversation(conversationId: string) {
//     return this.prisma.conversation.findUnique({
//       where: { id: conversationId },
//       include: {
//         participants:{
//           select: { id: true, email: true, userName: true },
//         },
//         messages: {
//           select: { id: true, text: true, createdAt: true, senderId: true },
//           orderBy: { createdAt: 'asc' },
//         },
//         lastMessage: {
//           select: { id: true, text: true, createdAt: true, senderId: true },
//         },
//       },
//     });
//   }
//   // conversation.service.ts
// async getMessages(conversationId: string, skip: number, take: number) {
//   return this.prisma.message.findMany({
//     where: { conversationId },
//     orderBy: { createdAt: 'asc' }, // latest first
//     skip,
//     take,
//     select: {
//       id: true,
//       text: true,
//       createdAt: true,
//       sender: { select: { id: true, userName: true, email: true } },
//     },
//   });
// }

// }


import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationDto } from './dto/conversations.dto';

@Injectable()
export class ConversationService {
  constructor(private prisma: PrismaService) { }

  // async createConversation(conversation: ConversationDto) {
  //   // check if conversation between these two users already exists
  //   const existing = await this.prisma.conversation.findFirst({
  //     where: {
  //       participants: {
  //         every: {
  //           userId: { in: conversation.participants }
  //         },
  //       },
  //     },
  //     include: {
  //       participants: {
  //         include: {
  //           user: {
  //             select: { id: true, email: true, userName: true },
  //           }
  //         }
  //       },
  //     },
  //   });

  //   if (existing) {
  //     return existing; // return existing conversation instead of creating a new one
  //   }

  //   return this.prisma.conversation.create({
  //     data: {
  //       participants: {
  //         create: conversation.participants.map((userId) => ({
            
  //           user: { connect: { id: userId } },
  //         })),
  //       },
  //     },
  //     include: {
  //       participants: {
  //         include: {
  //           user: {
  //             select: { id: true, email: true, userName: true, createdAt: true },
  //           },
  //         },
  //       },
  //     },
  //   });

  // }
  async createConversation(conversation: ConversationDto) {
  const participantIds = conversation.participants;

  // ✅ Check if a conversation already exists between these two users
  const existing = await this.prisma.conversation.findFirst({
    where: {
      AND: participantIds.map((userId) => ({
        participants: { some: { userId } },
      })),
      // optional: if you want *only* 1-on-1 chats, ensure there are exactly 2
      participants: { every: { userId: { in: participantIds } } },
    },
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, email: true, userName: true },
          },
        },
      },
    },
  });

  if (existing) return existing;

  // ✅ Create a new conversation with connected participants
  const newConversation = await this.prisma.conversation.create({
    data: {
      participants: {
        create: participantIds.map((userId) => ({
          user: { connect: { id: userId } },
        })),
      },
    },
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, email: true, userName: true, createdAt: true },
          },
        },
      },
    },
  });

  return newConversation;
}


  async getUserConversations(userId?: string) {
    return this.prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
            select:{
              unreadCount: true,
              user: {
                select: { id: true, email: true, userName: true, createdAt: true,
                },
            }
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
        participants: {
          include: {
            user: { select: { id: true, email: true, userName: true } },
          },
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
  
return await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' }, // latest first
      skip,
      take,
      select: {
        id: true,
        text: true,
        type:true,
        mediaUrl:true,
        fileName:true,
        fileSize:true,
        createdAt: true,
        isRead: true,
        sender: { select: { id: true, userName: true, email: true } },
      },
    });
  }
  async resetUnreadCount(conversationId: string, userId?: string) {
  console.log("the convffd", conversationId);
  
  return this.prisma.participant.updateMany({
    where: { conversationId, userId },
    data: { unreadCount: 0 },
    
  });
  // console.log(  await this.prisma.participant.updateMany({
  //   where: { conversationId, userId },
  //   data: { unreadCount: 0 },
    
  // }));
}
}

