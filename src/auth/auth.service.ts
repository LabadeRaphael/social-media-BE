import { sendResetPasswordEmail } from './../utils/mailer';
import { BadRequestException, Body, ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ConfigType } from '@nestjs/config';
import authConfig from 'src/config/auth.config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ForgotPswDto } from './dto/forgot-psw.dto';
import { ResetPasswordDto } from './dto/reset-psw.dto';
import { User } from 'generated/prisma';
import { Response } from 'express';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    @Inject(authConfig.KEY)
    private readonly authConfiguration: ConfigType<typeof authConfig>,
    private readonly jwtService: JwtService
  ) { }
  async register(user: RegisterDto) {
    return await this.usersService.register(user);
  }
  async login(login: LoginDto) {
    // console.log(this.authConfiguration);
    const user = await this.usersService.login(login);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');

    }

    const passwordValid = await bcrypt.compare(login.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateLoginTokens(user)

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
    await this.usersService.saveRefreshToken(user.id, refreshToken, expiresAt);
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
      // Don’t reveal if email exists for security
      console.log(`Password reset requested for non-existent email: ${forgotPsw.email}`);
      return;
    }
    // Generate short-lived reset token
    const resetPswToken = await this.generateResetToken(user)
    console.log(resetPswToken);

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

      await this.usersService.updatePassword(userId, newPassword);
      // 6. Revoke ALL refresh tokens for this user
      await this.usersService.deleteAllRefreshTokens(userId)

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new BadRequestException('Reset token has expired. Please request a new one.');
      } else {
        console.log(error.message);
        throw error
      }
    }

  }

  async revokeAllRefreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.authConfiguration.jwtRefreshSecret,
        audience: this.authConfiguration.jwtAudience,
        issuer: this.authConfiguration.jwtIssuer,
      });

      const userId = payload.sub;

      // delete all tokens for this user
      await this.usersService.deleteAllRefreshTokens(userId);
    } catch (error) {
      console.log(error.message);

      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
  async refreshToken(refreshTokenDto: RefreshTokenDto) {

    const { refreshToken } = refreshTokenDto

    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.authConfiguration.jwtRefreshSecret,
        audience: this.authConfiguration.jwtAudience,
        issuer: this.authConfiguration.jwtIssuer
      });

      const user = await this.usersService.findById(payload.sub);
      
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      
      const stored = await this.usersService.validateRefreshToken(user.id, refreshToken);
      if (!stored) {
        throw new UnauthorizedException('Refresh token invalid or revoked');
      }
      if (stored.expiresAt < new Date()) {
        await this.usersService.deleteRefreshToken(refreshToken)
      }
      return this.generateLoginTokens(user)

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Refresh token expired');
      }
      throw error
    }

  }

  async logout(logout: LogoutDto) {
    const { refreshToken } = logout

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
