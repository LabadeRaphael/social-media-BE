// import { resetUnreadCount } from '@/api/user';
import { Controller, Post, Body, Get, Param, ValidationPipe, Query, ParseIntPipe, DefaultValuePipe, Req, Patch } from '@nestjs/common';
import { ConversationService } from './conversations.service';
import { ConversationDto } from './dto/conversations.dto';
import { Request } from 'express';
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

  @Get('conversations/current-user')
  async getUserConversations(@Req() req:Request &{ user?:{sub:string}}) {
    const userId = req.user?.sub
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
  @Query('take', new DefaultValuePipe(980), ParseIntPipe) take: number,
) {

  return this.conversationService.getMessages(conversationId, skip, take);
}
@Patch('conversations/:conversationId/unread/reset')
async resetUnreadCount(
  @Req() req:Request &{ user?:{sub:string}},
  @Param('conversationId') conversationId: string,
) {
  const userId = req.user?.sub
  console.log(req.user);
  
  console.log("Mr user id", userId);
  
  console.log("user id",userId);
  return this.conversationService.resetUnreadCount(conversationId, userId);
}

}
