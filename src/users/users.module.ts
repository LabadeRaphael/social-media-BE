import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersService } from './users.service';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { AuthHelper } from 'src/auth/helpers/verify-password.helper';
import { CookiesService } from 'src/auth/cookies.service';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  controllers: [UsersController],
  providers: [UsersService,AuthHelper,CookiesService],
  exports: [UsersService]
})
export class UsersModule {}
