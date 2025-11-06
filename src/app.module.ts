/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthorizeGuard } from './auth/guards/authorize.guard';
import { ConfigModule } from '@nestjs/config';
import databaseConfig from './config/database.config';
import { envValidator } from './config/env.validation';
import { ConversationModule } from './conversations/conversations.module';
import { MessageModule } from './messages/messages.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TokenCleanupService } from './auth/token-cleanup.service';
@Module({
  imports: [UsersModule, PrismaModule, AuthModule, ConversationModule, MessageModule, ScheduleModule.forRoot(),ConfigModule.forRoot({isGlobal:true,load:[databaseConfig], validationSchema: envValidator})],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthorizeGuard
    },
    TokenCleanupService
  ]
})
export class AppModule {}
