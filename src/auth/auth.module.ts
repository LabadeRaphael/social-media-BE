import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from 'src/users/users.module';
import { ConfigModule, ConfigType } from '@nestjs/config';
import authConfig from 'src/config/auth.config';
// import { JwtModule } from '@nestjs/jwt';
import { JwtModule, JwtModuleAsyncOptions } from '@nestjs/jwt';
import { CookiesService } from './cookies.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthHelper } from './helpers/verify-password.helper';
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
  imports: [
    UsersModule, ConfigModule.forFeature(authConfig),
    JwtModule.registerAsync(jwtProvider()),
    PrismaModule
  ],
  controllers: [AuthController],
  providers: [AuthService, CookiesService,AuthHelper],
  exports: [AuthService, JwtModule]
})
export class AuthModule {}
