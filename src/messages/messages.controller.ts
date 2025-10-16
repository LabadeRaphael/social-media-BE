import {
    BadRequestException, UploadedFile,
    UseInterceptors, Body, Controller, Post, Req
} from '@nestjs/common';
import { MessageDto } from './dto/messages.dto';
import { MessageService } from './messages.service';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/config/multer.config';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
@Controller()
export class MessageController {
    constructor(
        private readonly messageService: MessageService,
        private readonly cloudinaryService: CloudinaryService
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
    @Post('messages/voice')
    @UseInterceptors(FileInterceptor('file', multerConfig))
    async uploadVoice(
        @UploadedFile() file: Express.Multer.File,
        @Req() req: Request & { user: { sub: string } },
        @Body() body: { conversationId: string },
    ) {
        if (!file) throw new BadRequestException('No file uploaded');
        const userId = req?.user.sub;
        const conversationId = body.conversationId;
        // Upload audio file to Cloudinary
        const uploadResult = await this.cloudinaryService.uploadFile(file);
        if (('secure_url' in uploadResult)) {
            // Save message record in database
            return this.messageService.saveAudio(conversationId, uploadResult, userId)
        }else{
            throw new BadRequestException('Cloudinary upload failed');
        }
        
    }
}
