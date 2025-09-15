import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ConversationService } from './conversation.service';

@Controller('conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  async createConversation(
    @Body('userId') userId: string,
    @Body('otherUserId') otherUserId: string,
  ) {
    return this.conversationService.createConversation(userId, otherUserId);
  }

  // Uncomment later if you want them active

  // @Get('user/:userId')
  // async getUserConversations(@Param('userId') userId: string) {
  //   return this.conversationService.getUserConversations(userId);
  // }

  // @Get(':conversationId')
  // async getConversation(@Param('conversationId') conversationId: string) {
  //   return this.conversationService.getConversation(conversationId);
  // }
}
