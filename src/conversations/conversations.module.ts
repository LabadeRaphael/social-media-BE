import { Module } from '@nestjs/common';
import { ConversationService } from './conversations.service';
import { ConversationController } from './conversations.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ConversationController],
  providers: [ConversationService, PrismaService],
})
export class ConversationModule {}
