import { sendRecoverAccountEmail, sendResetPasswordEmail } from './../utils/mailer';
import { BadRequestException, Body, ForbiddenException, GoneException, Inject, Injectable, InternalServerErrorException, UnauthorizedException, NotFoundException } from '@nestjs/common';
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
import { AuthHelper } from './helpers/verify-password.helper';
import { RecoverDto } from './dto/recover-account.dto';
import { VerifyActDto } from './dto/verify-account.dto';
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    @Inject(authConfig.KEY)
    private readonly authConfiguration: ConfigType<typeof authConfig>,
    private readonly jwtService: JwtService,
    private readonly authHelper: AuthHelper
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

    // await this.authHelper.verifyPasswordOrThrow(user.id, login.password)
    await this.authHelper.verifyPasswordOrThrow(
      user.id,
      login.password
    );


    return this.generateLoginTokens(user);


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
    // console.log("Saved refresh token:", savedToken);

    // console.log(this.authConfiguration.jwtAccessExpiration);
    // console.log(this.authConfiguration.jwtRefreshExpiration);
    const decoded = this.jwtService.verify(accessToken, {
      secret: this.authConfiguration.jwtAccessSecret,
      audience: this.authConfiguration.jwtAudience,
      issuer: this.authConfiguration.jwtIssuer
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpireAt: decoded.exp * 1000,
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
  private async generateRecoverActToken(user: User) {
    const recoverActToken = await this.signToken(
      user.id,
      this.authConfiguration.jwtResetPswExpiration!,
      this.authConfiguration.jwtRecoverAccountSecret!
    );

    return recoverActToken;
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
    await this.usersService.saveResetPswToken(user?.id, hashedPswToken, expiresAt)
    // Send email with nodemailer util
    await sendResetPasswordEmail(user.email, resetPswToken);

  }
  async recoverAccount(recoverAct: RecoverDto) {

    const user = await this.usersService.findByEmail(recoverAct);
    if (!user) {
      throw new NotFoundException("User no found")
    }
    if (!user?.isDeleted) {
      const resetPswToken = await this.generateResetToken(user)
      await sendResetPasswordEmail(user.email, resetPswToken);
      console.log(`Recover requested for active account: ${recoverAct.email}`);
      // throw new BadRequestException("Account is active. Please use password reset instead.")
    }

    const recoverActToken = await this.generateRecoverActToken(user)
    console.log("recoverActToken", recoverActToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
    const hashedToken = await bcrypt.hash(recoverActToken, 10);

    await this.usersService.saveRecoverActToken(user.id, hashedToken, expiresAt)
    // Send email with nodemailer util
    await sendRecoverAccountEmail(user.email, recoverActToken);

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
        throw new UnauthorizedException('Invalid token or user not found');
      }
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        throw new BadRequestException('New password cannot be the same as the old one');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const tokenRecord = await this.usersService.findResetToken(userId)
      console.log(tokenRecord);

      if (!tokenRecord) {
        throw new BadRequestException('This reset link is invalid or has already been used.');
      }
      const match = await bcrypt.compare(resetPsw.token, tokenRecord.hashedPswToken);
      if (!match) throw new ForbiddenException('Invalid reset token');

      await this.usersService.updatePassword(userId, hashedPassword);
      await this.usersService.updateTokenState(userId);
      await this.usersService.deleteAllRefreshTokens(userId)
          const deleteOldToken = await this.usersService.deleteRecoverToken(user.id)
    console.log("deleteOldToken", deleteOldToken);
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
  async verifyRecoverAccount(dto: VerifyActDto) {
    const { token } = dto;
    console.log("token", token);

    if (!token) {
      throw new BadRequestException('Invalid recovery token');
    }

    try {
      //  1. Verify JWT
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.authConfiguration.jwtRecoverAccountSecret,
        audience: this.authConfiguration.jwtAudience,
        issuer: this.authConfiguration.jwtIssuer,
      });

      const userId = payload.sub;

      // 2. Get user
      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new UnauthorizedException('Invalid token or user not found');
      }
     
        // Used check 
     
    
       

      // 🔍 4. Get stored token from DB
      const tokenRecord = await this.usersService.findRecoverToken(userId);

      if (!tokenRecord) {
        console.log("token error", tokenRecord);
        
        throw new BadRequestException(
          'This recovery link is invalid or has already been used.',
        );
      }
      console.log("tokenRecord", tokenRecord);

      //  5. Compare token with hashed version
      const match = await bcrypt.compare(
        token,
        tokenRecord.hashedToken,
      );

      if (!match) {
        throw new ForbiddenException('Invalid recovery token');
      }
    
      if (tokenRecord.used) {
        throw new BadRequestException(
          'Recovery link already used. Please request a new one.',
        );
      }
      // Expiry check 
      if (tokenRecord.expiresAt < new Date()) {
        console.log("here", tokenRecord.expiresAt);

        throw new GoneException(
          'Recovery link has expired. Please request a new one.',
        );
      }
        // 3. Check if already active
      if (!user.deletedAt) {
        return {
          status: true,
          message: "Account already active. You can log in.",
        };
      }

      // 7. Restore account
      await this.usersService.restoreAccount(userId);

      // 8. Mark token as used
      await this.usersService.updateRecoverTokenState(userId);

      // 9. Optional (VERY GOOD): invalidate sessions
      await this.usersService.deleteAllRefreshTokens(userId);

      return {
        status: true,
        message: 'Account successfully restored',
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        console.log("issue", error.name);

        throw new BadRequestException(
          'Recovery link has expired. Please request a new one.',
        );
      } else if (error.name === 'JsonWebTokenError') {
        console.log("from here", error.name);

        throw new BadRequestException('Invalid recovery token.');
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
      // console.log(stored);

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
