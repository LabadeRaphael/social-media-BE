import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from 'src/users/users.module';
import { ConfigModule, ConfigType } from '@nestjs/config';
import authConfig from 'src/config/auth.config';
// import { JwtModule } from '@nestjs/jwt';
import { JwtModule, JwtModuleAsyncOptions } from '@nestjs/jwt';
const jwtProvider = (): JwtModuleAsyncOptions => ({
  imports: [ConfigModule.forFeature(authConfig)],
  inject: [authConfig.KEY],
  useFactory: (config: ConfigType<typeof authConfig>) => ({
    secret: config.jwtSecret,
    signOptions: {
      expiresIn: config.jwtExpiration,
      audience: config.audience,
      issuer: config.issuer,
    },
  }),
});
@Module({
  imports: [
    UsersModule, ConfigModule.forFeature(authConfig),
    JwtModule.registerAsync(jwtProvider())
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule]
})
export class AuthModule {}
