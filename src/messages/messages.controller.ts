import { Body, Controller, Post, ValidationPipe, } from '@nestjs/common';
import { MessageDto } from './dto/messages.dto';
import { MessageService } from './messages.service';

@Controller()
export class MessageController{
    constructor(
        private readonly messageService:MessageService
    ) { }
    @Post('messages')
    async sendMessage(@Body(new ValidationPipe()) message: MessageDto) {
        return this.messageService.sendMessage(message);
    }

}