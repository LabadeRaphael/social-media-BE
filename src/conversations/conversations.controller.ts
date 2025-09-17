import { Controller, Post, Body, Get, Param, ValidationPipe, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ConversationService } from './conversations.service';
import { ConversationDto } from './dto/conversations.dto';

@Controller()
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post('new-conversations')
  async createConversation(
    @Body(new ValidationPipe()) conversation: ConversationDto) {
    const saveConversation = await this.conversationService.createConversation(conversation);
    return{
      message: 'Conversation created successfully', 
      status: true,
      saveConversation
    }
    
  }

  @Get('conversations/user/:userId')
  async getUserConversations(@Param('userId') userId: string) {
    console.log(userId);
    
    return this.conversationService.getUserConversations(userId);
  }

  @Get('conversations/:conversationId')
  
  async getConversation(@Param('conversationId') conversationId: string) {
    return this.conversationService.getConversation(conversationId);
  }
  // conversation.controller.ts
@Get('conversations/:conversationId/messages')
async getMessages(
  @Param('conversationId') conversationId: string,
  @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
  @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
) {
  return this.conversationService.getMessages(conversationId, skip, take);
}

}
