import { Injectable } from '@nestjs/common';
import { MessageDto } from './dto/messages.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MessageService {
    constructor(
        private readonly prisma:PrismaService
    ) {}
    async sendMessage(dto: MessageDto) {
  // create message with flexible type
  const message = await this.prisma.message.create({
    data: {
      text: dto.text ?? null, // allow null for non-text messages
      type: dto.type,
      sender: { connect: { id: dto.senderId } },
      conversation: { connect: { id: dto.conversationId } },
    },
    select: {
      id: true,
      text: true,
      type: true,
      createdAt: true,
      senderId: true,
    },
  });

  // update conversation’s lastMessageId
  await this.prisma.conversation.update({
    where: { id: dto.conversationId },
    data: { lastMessageId: message.id },
  });

  return message;
}

}