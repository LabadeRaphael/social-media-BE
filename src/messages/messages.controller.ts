import { Body, Controller, Post, Req } from '@nestjs/common';
import { MessageDto } from './dto/messages.dto';
import { MessageService } from './messages.service';
import { Request } from 'express';
@Controller()
export class MessageController {
    constructor(
        private readonly messageService: MessageService
    ) { }
    @Post('messages')
    async sendMessage(
        @Req() req: Request & { user: { sub: string } },
        @Body() message: MessageDto) {
        const senderId = req.user.sub;
        return this.messageService.sendMessage(message, senderId);
    }
    @Post('mark-read')
    async markAsRead(@Body() body: { conversationId: string }, @Req() req: Request & { user: { sub: string } }) {
        const userId = req.user?.sub; // or however you get it from JWT
        console.log(userId);

        return this.messageService.markMessagesAsRead(body.conversationId, userId);
    }

}