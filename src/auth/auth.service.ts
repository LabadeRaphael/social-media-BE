import { sendEmailChangeVerification, sendRecoverAccountEmail, sendResetPasswordEmail, sendWarningRecoverAccount } from './../utils/mailer';
import { BadRequestException, Body, ForbiddenException, GoneException, Inject, Injectable, InternalServerErrorException, UnauthorizedException, NotFoundException, HttpException } from '@nestjs/common';
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
import { VerifyEmailChangeDto } from './dto/verify-email-change';
import { RequestEmailChangeDto } from './dto/request-email-change.dto';
import * as ms from 'ms';
type SafeUser = {
  id: string;
  email: string;
  userName: string;
};
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    @Inject(authConfig.KEY)
    private readonly authConfiguration: ConfigType<typeof authConfig>,
    private readonly jwtService: JwtService,
    private readonly authHelper: AuthHelper
  ) { }
  private getExpiryDate(expiresIn: string): Date {
    const duration = ms(expiresIn as ms.StringValue);

    if (typeof duration !== 'number' || !Number.isFinite(duration)) {
      throw new InternalServerErrorException(
        `Invalid token expiration duration: ${expiresIn}`,
      );
    }

    return new Date(Date.now() + duration);
  }

  async register(user: RegisterDto) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    return this.usersService.register(user, hashedPassword);


  }
  // async login(login: LoginDto) {
  //   // console.log(this.authConfiguration);
  //   const user = await this.usersService.login(login);
  //   if (!user) {
  //     throw new UnauthorizedException('Invalid credentials');

  //   }

  //   // await this.authHelper.verifyPasswordOrThrow(user.id, login.password)
  //   await this.authHelper.verifyPasswordOrThrow(
  //     user.id,
  //     login.password
  //   );

  //   return this.generateLoginTokens(user);

  // }
  async login(login: LoginDto) {
    const user = await this.usersService.login(login);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const verifiedUser = await this.authHelper.verifyPasswordOrThrow(
      user.id,
      login.password,
    );

    return this.generateLoginTokens(verifiedUser);
  }


  async loginWithGoogle({
    googleId,
    email,
    emailVerified,
    picture,
  }: {
    googleId: string;
    email: string;
    emailVerified: boolean;
    picture?: string;
  }) {
    const user = await this.usersService.findOrCreateGoogleUser({
      googleId,
      email,
      emailVerified,
      picture,
    });

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
    // const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const expiresAt = this.getExpiryDate(
      this.authConfiguration.jwtRefreshExpiration!,
    );
    console.log(user.id, refreshToken, expiresAt);
    await this.usersService.saveRefreshToken(user.id, refreshToken, expiresAt);
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
  private async generateChangeEmailToken(user: User, newEmail: string) {
    return this.signToken(
      user.id,
      this.authConfiguration.jwtChangeEmailExpiration!,
      this.authConfiguration.jwtChangeEmailSecret!,
      {
        newEmail,
      }
    );
  }

  async generateAndSendRecoverToken(

    user: SafeUser,
    options: {
      expiresIn: string;
      emailType: 'recover' | 'warning';
    }
  ) {
    const { expiresIn, emailType } = options;

    const recoverToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
      },
      {
        secret: this.authConfiguration.jwtRecoverAccountSecret,
        expiresIn,
        audience: this.authConfiguration.jwtAudience,
        issuer: this.authConfiguration.jwtIssuer,
      }
    );

    const expiresAt = this.getExpiryDate(expiresIn);
    const hashedToken = await bcrypt.hash(recoverToken, 10);
    await this.usersService.saveRecoverActToken(user.id, hashedToken, expiresAt)
    // await this.prisma.recoverToken.upsert({
    //   where: { userId: user.id },
    //   update: {
    //     hashedToken,
    //     expiresAt,
    //     used: false,
    //   },
    //   create: {
    //     userId: user.id,
    //     hashedToken,
    //     expiresAt,
    //     used: false,
    //   },
    // });

    // 👇 Different emails based on context
    if (emailType === 'recover') {

      await sendRecoverAccountEmail(user.email, recoverToken);
    }
    else {
      await sendWarningRecoverAccount(user.email, recoverToken);
    }
  }



  async forgotPassword(forgotPsw: ForgotPswDto) {
    const { email } = forgotPsw;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${forgotPsw.email}`);
      return;
    }

    // Prevent password reset on deleted accounts.
    if (user.isDeleted) {
      console.log(`Password reset requested for deleted account: ${email}`);
      return;
    }

    const resetPswToken = await this.generateResetToken(user)
    // console.log("resetPswToken", resetPswToken);
    // const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
    const expiresAt = this.getExpiryDate(
      this.authConfiguration.jwtResetPswExpiration!,
    );
    const hashedPswToken = await bcrypt.hash(resetPswToken, 10);
    await this.usersService.saveResetPswToken(user?.id, hashedPswToken, expiresAt)
    // Send email with nodemailer util
    await sendResetPasswordEmail(user.email, resetPswToken);

  }

  async recoverAccount(recoverAct: RecoverDto) {
    const { email } = recoverAct;

    const genericResponse = {
      status: true,
      message: 'If an eligible account exists, recovery instructions will be sent.',
    };

    const user = await this.usersService.findByEmail(email);

    if (!user || !user.isDeleted || !user.deletedAt) {
      return genericResponse;
    }

    // Check the 30-day recovery deadline.
    const recoveryDeadline = new Date(
      user.deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    if (recoveryDeadline <= new Date()) {
      return genericResponse;
    }

    await this.generateAndSendRecoverToken(user, {
      expiresIn: this.authConfiguration.jwtRecoverAccountExpiration!,
      emailType: 'recover',
    });

    return genericResponse;
  }

  // async resetPassword(resetPsw: ResetPasswordDto) {

  //   const { newPassword, confirmPassword } = resetPsw
  //   if (newPassword !== confirmPassword) {
  //     throw new BadRequestException('Passwords do not match');
  //   }
  //   try {
  //     const payload = await this.jwtService.verifyAsync(resetPsw.token, {
  //       secret: this.authConfiguration.jwtResetPswSecret,
  //       audience: this.authConfiguration.jwtAudience,
  //       issuer: this.authConfiguration.jwtIssuer
  //     });
  //     const userId = payload.sub;
  //     const user = await this.usersService.findById(userId);
  //     if (!user) {
  //       throw new UnauthorizedException('Invalid token or user not found');
  //     }
  //     const isSamePassword = user.password ? await bcrypt.compare(newPassword, user.password) : false;
  //     if (isSamePassword) {
  //       throw new BadRequestException('New password cannot be the same as the old one');
  //     }

  //     const hashedPassword = await bcrypt.hash(newPassword, 10);
  //     const tokenRecord = await this.usersService.findResetToken(userId)
  //     console.log(tokenRecord);

  //     if (!tokenRecord) {
  //       throw new BadRequestException('This reset link is invalid or has already been used.');
  //     }
  //     const match = await bcrypt.compare(resetPsw.token, tokenRecord.hashedPswToken);
  //     if (!match) throw new ForbiddenException('Invalid reset token');

  //     await this.usersService.updatePassword(userId, hashedPassword);
  //     await this.usersService.updateTokenState(userId);
  //     await this.usersService.deleteAllRefreshTokens(userId)
  //   } catch (error) {
  //     if (error instanceof HttpException) {
  //       throw error;
  //     }
  //     if (error.name === 'TokenExpiredError') {
  //       throw new BadRequestException('Reset token has expired. Please request a new one.');
  //     } else if (error.name === 'JsonWebTokenError') {
  //       throw new BadRequestException('Invalid reset token.');
  //     } else {
  //       throw new BadRequestException(error.message || 'An error occurred.');
  //     }
  //   }

  // }
  async resetPassword(resetPsw: ResetPasswordDto) {
    const { newPassword, confirmPassword, token } = resetPsw;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    try {
      // 1. Verify the JWT signature, expiry, audience and issuer.
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.authConfiguration.jwtResetPswSecret,
        audience: this.authConfiguration.jwtAudience,
        issuer: this.authConfiguration.jwtIssuer,
      });

      const userId = payload.sub;

      if (!userId) {
        throw new BadRequestException('Invalid reset token.');
      }

      // 2. Find the account.
      const user = await this.usersService.findById(userId);

      if (!user) {
        throw new UnauthorizedException('Invalid token or user not found');
      }

      // 3. Do not allow password changes on deleted accounts.
      if (user.isDeleted) {
        throw new ForbiddenException(
          'This account is deleted. Please recover your account first.',
        );
      }

      // 4. Find the corresponding unused reset-token record.
      const tokenRecord = await this.usersService.findResetToken(userId);

      if (!tokenRecord) {
        throw new BadRequestException(
          'This reset link is invalid or has already been used.',
        );
      }

      // 5. Check database expiry as well as JWT expiry.
      if (tokenRecord.expiresAt <= new Date()) {
        throw new GoneException(
          'Reset link has expired. Please request a new one.',
        );
      }

      // 6. Verify that this JWT matches the stored hash.
      const match = await bcrypt.compare(
        token,
        tokenRecord.hashedPswToken,
      );

      if (!match) {
        throw new ForbiddenException('Invalid reset token');
      }

      // 7. Prevent reusing the existing password.
      // Google-only users have no existing password, so this check is skipped.
      if (
        user.password &&
        await bcrypt.compare(newPassword, user.password)
      ) {
        throw new BadRequestException(
          'New password cannot be the same as the old one',
        );
      }

      // 8. Hash the new password.
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // 9. Atomically update password, consume tokens and revoke sessions.
      const completed = await this.usersService.completePasswordReset(
        userId,
        tokenRecord.id,
        hashedPassword,
      );

      if (!completed) {
        throw new BadRequestException(
          'This reset link is invalid, expired or has already been used.',
        );
      }

      return {
        status: true,
        message: 'Password successfully updated. Please log in again.',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw new GoneException(
          'Reset token has expired. Please request a new one.',
        );
      }

      if (error instanceof Error && error.name === 'JsonWebTokenError') {
        throw new BadRequestException('Invalid reset token.');
      }

      throw new InternalServerErrorException(
        'Unable to reset password. Please try again.',
      );
    }
  }
  // async verifyRecoverAccount(dto: VerifyActDto) {
  //   const { token } = dto;

  //   try {
  //     // 1. Verify JWT
  //     const payload = await this.jwtService.verifyAsync(token, {
  //       secret: this.authConfiguration.jwtRecoverAccountSecret,
  //       audience: this.authConfiguration.jwtAudience,
  //       issuer: this.authConfiguration.jwtIssuer,
  //     });

  //     const userId = payload.sub;

  //     // 2. Get user
  //     const user = await this.usersService.findById(userId);
  //     if (!user) {
  //       throw new UnauthorizedException('Invalid recovery token or user not found');
  //     }

  //     // 3. If already active → exit early (IMPORTANT OPTIMIZATION)
  //     if (!user.deletedAt) {
  //       return {
  //         status: true,
  //         message: "Account already active. You can log in.",
  //       };
  //     }

  //     // 4. Get stored token
  //     const tokenRecord = await this.usersService.findRecoverToken(userId);

  //     if (!tokenRecord) {
  //       throw new BadRequestException(
  //         'Recovery link is invalid or already used.',
  //       );
  //     }

  //     // 5. Validate token hash
  //     const match = await bcrypt.compare(token, tokenRecord.hashedToken);

  //     if (!match) {
  //       throw new ForbiddenException('Invalid recovery token');
  //     }

  //     // 6. Check used
  //     if (tokenRecord.used) {
  //       throw new BadRequestException(
  //         'Recovery link already used. Please request a new one.',
  //       );
  //     }

  //     // 7. Check expiry
  //     if (tokenRecord.expiresAt < new Date()) {
  //       throw new GoneException(
  //         'Recovery link has expired. Please request a new one.',
  //       );
  //     }

  //     // 8. Restore account
  //     await this.usersService.restoreAccount(userId);

  //     // 9. Mark token used
  //     await this.usersService.updateRecoverTokenState(userId);

  //     // 10. Security cleanup
  //     await this.usersService.deleteAllRefreshTokens(userId);
  //     await this.usersService.deleteRecoverToken(userId);

  //     return {
  //       status: true,
  //       message: 'Account successfully restored',
  //     };
  //   } catch (error) {
  //     if (error instanceof HttpException) {
  //       throw error;
  //     }
  //     if (error.name === 'TokenExpiredError') {
  //       throw new BadRequestException(
  //         'Recovery link has expired. Please request a new one.',
  //       );
  //     }

  //     if (error.name === 'JsonWebTokenError') {
  //       throw new BadRequestException('Invalid recovery token.');
  //     }

  //     throw new BadRequestException(error.message || 'An error occurred.');
  //   }
  // }
  async verifyRecoverAccount(dto: VerifyActDto) {
    const { token } = dto;

    try {
      // 1. Verify JWT
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.authConfiguration.jwtRecoverAccountSecret,
        audience: this.authConfiguration.jwtAudience,
        issuer: this.authConfiguration.jwtIssuer,
      });

      const userId = payload.sub;

      // 2. Get user
      const user = await this.usersService.findById(userId);

      if (!user) {
        throw new UnauthorizedException(
          'Invalid recovery token or user not found',
        );
      }

      // 3. Check account eligibility
      if (!user.isDeleted || !user.deletedAt) {
        return {
          status: true,
          message: 'If this recovery request is valid, the account will be restored.',
        };
      }

      // 4. Check the 30-day account recovery deadline
      const recoveryDeadline = new Date(
        user.deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000,
      );

      if (recoveryDeadline <= new Date()) {
        throw new GoneException(
          'Account recovery period has expired.',
        );
      }

      // 5. Get stored token
      const tokenRecord = await this.usersService.findRecoverToken(userId);

      if (!tokenRecord) {
        throw new BadRequestException(
          'Recovery link is invalid or already used.',
        );
      }

      // 6. Validate token hash
      const match = await bcrypt.compare(token, tokenRecord.hashedToken);

      if (!match) {
        throw new ForbiddenException('Invalid recovery token');
      }

      // 7. Check used
      if (tokenRecord.used) {
        throw new BadRequestException(
          'Recovery link already used. Please request a new one.',
        );
      }

      // 8. Check token expiry
      if (tokenRecord.expiresAt <= new Date()) {
        throw new GoneException(
          'Recovery link has expired. Please request a new one.',
        );
      }

      // 9. Restore account
      await this.usersService.restoreAccount(userId);

      // 10. Security cleanup
      await this.usersService.updateRecoverTokenState(userId);
      await this.usersService.deleteAllRefreshTokens(userId);
      await this.usersService.deleteRecoverToken(userId);

      return {
        status: true,
        message: 'Account successfully restored',
      };

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw new GoneException(
          'Recovery link has expired. Please request a new one.',
        );
      }

      if (error instanceof Error && error.name === 'JsonWebTokenError') {
        throw new BadRequestException('Invalid recovery token.');
      }

      throw new InternalServerErrorException(
        'Unable to recover account. Please try again.',
      );
    }
  }
  async isGoogleAccountLinked(userId: string, googleId: string) {
    return this.usersService.isGoogleAccountLinked(userId, googleId);
  }
  async softDeleteUserWithGoogle(userId: string, googleId: string) {
    return this.usersService.softDeleteUserWithGoogle(userId, googleId);
  }

  async verifyEmailChange(dto: VerifyEmailChangeDto) {
    const { token } = dto;

    try {
      // 1. Verify JWT
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.authConfiguration.jwtChangeEmailSecret,
        audience: this.authConfiguration.jwtAudience,
        issuer: this.authConfiguration.jwtIssuer,
      });

      const userId = payload.sub;
      const newEmail = payload.newEmail;

      // 2. Get user
      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new UnauthorizedException('Invalid token or user not found');
      }

      // 3. Get token record
      const tokenRecord = await this.usersService.findEmailChangeToken(userId);

      if (!tokenRecord) {
        throw new BadRequestException(
          'Email verification link is invalid or has already been used.',
        );
      }

      // 4. Validate token hash
      const match = await bcrypt.compare(token, tokenRecord.hashedToken);

      if (!match) {
        throw new ForbiddenException('Invalid email verification token');
      }

      // 5. Check used
      if (tokenRecord.used) {
        throw new BadRequestException(
          'Verification link already used. Please request a new one.',
        );
      }

      // 6. Check expiry
      if (tokenRecord.expiresAt < new Date()) {
        throw new GoneException(
          'Email verification link has expired. Please request a new one.',
        );
      }

      // 7. Check duplicate email (AFTER validation = better)
      const existingEmail = await this.usersService.findByEmail(newEmail);
      if (existingEmail) {
        throw new BadRequestException('Email already in use');
      }

      // 8. Update email
      await this.usersService.updateEmail(userId, newEmail);

      // 9. Mark token used
      await this.usersService.updateChangeEmailState(userId);

      // 10. Security cleanup
      await this.usersService.deleteAllRefreshTokens(userId);
      await this.usersService.deleteEmailChangeToken(userId);

      return {
        status: true,
        message: 'Email successfully updated',
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new BadRequestException(
          'Email verification link has expired. Please request a new one.',
        );
      }

      if (error.name === 'JsonWebTokenError') {
        throw new BadRequestException('Invalid email verification token.');
      }

      throw new BadRequestException(error.message || 'An error occurred.');
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
      if (stored.expiresAt <= new Date()) {
        await this.usersService.deleteRefreshToken(oldRefreshToken)
        throw new UnauthorizedException('Refresh token expired');
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
  async requestEmailChange(userId: string, dto: RequestEmailChangeDto) {
    const { newEmail, emailAuthPassword } = dto
    const user = await this.usersService.findById(userId);
    console.log("request user", user);

    if (!user) throw new BadRequestException('User not found');
    await this.authHelper.verifyPasswordOrThrow(
      user.id,
      emailAuthPassword
    );

    const changeEmailToken = await this.generateChangeEmailToken(user, newEmail)
    const expiresAt = this.getExpiryDate(
      this.authConfiguration.jwtChangeEmailExpiration!,
    );
    const hashedEmailChangeToken = await bcrypt.hash(changeEmailToken, 10);
    await this.usersService.saveEmailChangeToken(user?.id, hashedEmailChangeToken, expiresAt)
    await sendEmailChangeVerification(newEmail, changeEmailToken)

    return { message: 'Verification sent to new email', status: true };
  }
}
