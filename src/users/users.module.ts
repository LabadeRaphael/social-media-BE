import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersService } from './users.service';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { AuthHelper } from 'src/auth/helpers/verify-password.helper';
import { CookiesService } from 'src/auth/cookies.service';
import { AuthService } from 'src/auth/auth.service';
import { ConfigModule, ConfigType } from '@nestjs/config';
import authConfig from 'src/config/auth.config';
import { JwtModule, JwtModuleAsyncOptions } from '@nestjs/jwt';
const jwtProvider = (): JwtModuleAsyncOptions => ({
  imports: [ConfigModule.forFeature(authConfig)],
  inject: [authConfig.KEY],
  useFactory: (config: ConfigType<typeof authConfig>) => ({
    secret: config.jwtAccessSecret,
    signOptions: {
      expiresIn: config.jwtAccessExpiration,
      audience: config.jwtAudience,
      issuer: config.jwtIssuer,
    },
  }),
});
@Module({
  imports: [PrismaModule, CloudinaryModule, UsersModule, ConfigModule.forFeature(authConfig),
    JwtModule.registerAsync(jwtProvider()),
    PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, AuthHelper, CookiesService, AuthService],
  exports: [UsersService]
})
export class UsersModule { }
