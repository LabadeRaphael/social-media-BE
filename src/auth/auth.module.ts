import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from 'src/users/users.module';
import { ConfigModule, ConfigType } from '@nestjs/config';
import authConfig from 'src/config/auth.config';
// import { JwtModule } from '@nestjs/jwt';
import { JwtModule, JwtModuleAsyncOptions } from '@nestjs/jwt';
import { CookiesService } from './cookies.service';
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
    JwtModule.registerAsync(jwtProvider())
  ],
  controllers: [AuthController],
  providers: [AuthService, CookiesService],
  exports: [AuthService, JwtModule]
})
export class AuthModule {}
