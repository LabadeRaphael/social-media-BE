import { sendResetPasswordEmail } from './../utils/mailer';
import { BadRequestException, Body, ForbiddenException, Inject, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ConfigType } from '@nestjs/config';
import authConfig from 'src/config/auth.config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ForgotPswDto } from './dto/forgot-psw.dto';
import { ResetPasswordDto } from './dto/reset-psw.dto';
import { Response } from 'express';
import { User } from '@prisma/client';
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    @Inject(authConfig.KEY)
    private readonly authConfiguration: ConfigType<typeof authConfig>,
    private readonly jwtService: JwtService
  ) { }
  async register(user: RegisterDto) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    return this.usersService.register(user, hashedPassword);


  }
  async login(login: LoginDto) {
    // console.log(this.authConfiguration);
    const user = await this.usersService.login(login);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');

    }
    const passwordValid = await bcrypt.compare(login.password, user.password);
    console.log(passwordValid);
    
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return await this.generateLoginTokens(user);


  }
  private async signToken<T>(userId: string, expiresIn: string, secret: string, payload?: T,) {
    return this.jwtService.signAsync({
      sub: userId,
      ...payload
    }, {
      secret: secret,
      expiresIn: expiresIn,
      audience: this.authConfiguration.jwtAudience,
      issuer: this.authConfiguration.jwtIssuer
    })
  }
  private async generateLoginTokens(user: User) {

    const accessToken = await this.signToken(user.id, this.authConfiguration.jwtAccessExpiration!, this.authConfiguration.jwtAccessSecret!, { email: user.email })
    const refreshToken = await this.signToken(user.id, this.authConfiguration.jwtRefreshExpiration!, this.authConfiguration.jwtRefreshSecret!)

    // Compute expiresAt
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    console.log(user.id, refreshToken, expiresAt);
    const savedToken = await this.usersService.saveRefreshToken(user.id, refreshToken, expiresAt);
    console.log("Saved refresh token:", savedToken);

    return {
      accessToken,
      refreshToken,
    }
  }
  // Only generates reset token for password reset
  private async generateResetToken(user: User) {
    const resetPswToken = await this.signToken(
      user.id,
      this.authConfiguration.jwtResetPswExpiration!,
      this.authConfiguration.jwtResetPswSecret!
    );

    return resetPswToken;
  }

  async forgotPassword(forgotPsw: ForgotPswDto) {

    const user = await this.usersService.findByEmail(forgotPsw);
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${forgotPsw.email}`);
      return;
    }

    const resetPswToken = await this.generateResetToken(user)
    console.log("resetPswToken", resetPswToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
     const hashedPswToken = await bcrypt.hash(resetPswToken, 10);
     await this.usersService.saveResetPswToken(user.id, hashedPswToken, expiresAt)
    // Send email with nodemailer util
    await sendResetPasswordEmail(user.email, resetPswToken);

  }

  async resetPassword(resetPsw: ResetPasswordDto) {

    const { newPassword, confirmPassword } = resetPsw
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
    try {
      const payload = await this.jwtService.verifyAsync(resetPsw.token, {
        secret: this.authConfiguration.jwtResetPswSecret,
        audience: this.authConfiguration.jwtAudience,
        issuer: this.authConfiguration.jwtIssuer
      });
      const userId = payload.sub;
      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new BadRequestException('Invalid token or user not found');
      }
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        throw new BadRequestException('New password cannot be the same as the old one');
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.usersService.updatePassword(userId, hashedPassword);
      await this.usersService.deleteAllRefreshTokens(userId)

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new BadRequestException('Reset token has expired. Please request a new one.');
      } else if (error.name === 'JsonWebTokenError') {
        throw new BadRequestException('Invalid reset token.');
      } else {
        throw new BadRequestException(error.message || 'An error occurred.');
      }
    }

  }
  async refreshToken(oldRefreshToken?: string) {

    if (!oldRefreshToken) {
      throw new BadRequestException('Refresh token is required');
    }
    try {
      const payload = await this.jwtService.verifyAsync(oldRefreshToken, {
        secret: this.authConfiguration.jwtRefreshSecret,
        audience: this.authConfiguration.jwtAudience,
        issuer: this.authConfiguration.jwtIssuer
      });

      const user = await this.usersService.findById(payload.sub);
      console.log(user);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const stored = await this.usersService.validateRefreshToken(oldRefreshToken);
      console.log(stored);

      if (!stored) {
        throw new UnauthorizedException('Refresh token invalid or revoked');
      }
      if (stored.expiresAt < new Date()) {
        await this.usersService.deleteRefreshToken(oldRefreshToken)
      }
      return this.generateLoginTokens(user)

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Refresh token expired');
      }
      throw error
    }

  }

  async logout(refreshToken?: string) {

    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }
    try {
      await this.jwtService.verifyAsync(refreshToken, {
        secret: this.authConfiguration.jwtRefreshSecret,
        audience: this.authConfiguration.jwtAudience,
        issuer: this.authConfiguration.jwtIssuer
      });

      await this.usersService.deleteRefreshToken(refreshToken)

    } catch (error) {
      console.log(error.message);
      throw new ForbiddenException('Invalid or expired refresh token');
    }
  }

}
