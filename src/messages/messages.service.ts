import { Injectable } from '@nestjs/common';
import { MessageDto } from './dto/messages.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService
  ) { }
  async canSendMessage(conversationId: string, senderId: string) {
  const conversation = await this.prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              blockedUsers: { select: { id: true } },
            },
          },
        },
      },
    },
  });

  if (!conversation) {
    return { allowed: false, reason: 'CONVERSATION_NOT_FOUND' };
  }

  const senderParticipant = conversation.participants.find(
    p => p.user.id === senderId
  );

  if (!senderParticipant) {
    return { allowed: false, reason: 'NOT_PARTICIPANT' };
  }

  const receiverParticipant = conversation.participants.find(
    p => p.user.id !== senderId
  );

  if (!receiverParticipant) {
    return { allowed: false, reason: 'INVALID_CONVERSATION' };
  }

  const sender = senderParticipant.user;
  const receiver = receiverParticipant.user;
  console.log(sender,receiver);
    
  if (receiver.blockedUsers.some(u => u.id === senderId)) {
    return { allowed: false, reason: 'BLOCKED_BY_RECEIVER' };
  }

  if (sender.blockedUsers.some(u => u.id === receiver.id)) {
    return { allowed: false, reason: 'BLOCKED_BY_SENDER' };
  }

  return {
    allowed: true,
    conversation,
    sender,
    receiver,
  };
}

  async sendMessage(dto: MessageDto, senderId?: string) {
    // create message with flexible type
    

    const message = await this.prisma.message.create({

      data: {
        text: dto.text ?? null, // allow null for non-text messages
        type: dto.type,
        mediaUrl: dto.mediaUrl ?? null,
        duration: dto.duration ?? null,
        fileName: dto.fileName ?? null,
        fileSize: dto.fileSize ?? null,
        fileType: dto.fileType ?? null,
        sender: { connect: { id: senderId } },
        conversation: { connect: { id: dto.conversationId } },
        isRead: false,
      },
      select: {
        id: true,
        text: true,
        type: true,
        conversationId: true,
        mediaUrl: true,
        duration: true,
        fileName: true,
        fileSize: true,
        fileType: true,
        createdAt: true,
        senderId: true,
        isRead: true,
      },

    });

    // update conversation’s lastMessageId
    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: {
        lastMessageId: message.id
      },
    });

    await this.prisma.participant.updateMany({
      where: {
        conversationId: dto.conversationId,
        userId: { not: senderId }, // all except sender
      },
      data: {
        unreadCount: { increment: 1 },
      },
    });



    return message ;
  }

  // 4️⃣ Add function to mark all messages as read for the receiver
  async markMessagesAsRead(conversationId: string, receiverId: string) {
    // mark all unread messages in that conversation as read
    const result = await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: receiverId }, // 👈 only mark messages sent by others
        isRead: false,
      },
      data: { isRead: true },
    });

    // reset unreadCount for this participant
    await this.prisma.participant.updateMany({
      where: { conversationId, userId: receiverId },
      data: { unreadCount: 0 },
    });
    console.log("work");

    return { updatedCount: result.count };
  }

  // async saveAudio(conversationId: string, uploadResult: any, userId: string,) {
  //   console.log("uploadResult", uploadResult); // 🔍 debug

  // if (!uploadResult?.secure_url) {
  //   throw new Error("Audio upload failed, no URL returned");
  // }
  //   const message = await this.prisma.message.create({
  //     data: {
  //       senderId: userId,
  //       conversationId: conversationId,
  //       type: 'VOICE',
  //       mediaUrl: uploadResult.secure_url,
  //     }
  //   });
  //   console.log(message);

  //   await this.prisma.conversation.update({
  //     where: { id: conversationId },
  //     data: { lastMessageId: message.id },
  //   });
  // }


// async clearMessages(){

// }




}

