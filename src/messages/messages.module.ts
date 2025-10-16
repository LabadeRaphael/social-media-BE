import { Module } from '@nestjs/common';
import { MessageController } from './messages.controller';
import { MessageService } from './messages.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MessageGateway } from './messages.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
    imports: [AuthModule,CloudinaryModule], 
    controllers: [MessageController],
    providers: [MessageService, PrismaService, MessageGateway]
})
export class MessageModule {};