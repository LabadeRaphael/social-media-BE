import { Module } from '@nestjs/common';
import { MessageController } from './messages.controller';
import { MessageService } from './messages.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
    controllers: [MessageController],
    providers: [MessageService, PrismaService]
})
export class MessageModule {};