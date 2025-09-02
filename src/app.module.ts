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
@Module({
  imports: [UsersModule, PrismaModule, AuthModule, ConfigModule.forRoot({isGlobal:true,load:[databaseConfig], validationSchema: envValidator})],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthorizeGuard
    }
  ]
})
export class AppModule {}
