import { sendResetPasswordEmail } from './../utils/mailer';
import { BadRequestException, Body, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ConfigType } from '@nestjs/config';
import authConfig from 'src/config/auth.config';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ForgotPswDto } from './dto/forgot-psw.dto';
import { ResetPasswordDto } from './dto/reset-psw.dto';
import { User } from 'generated/prisma';
import { UsersDto } from 'src/users/dto/users.dto';
import { throwError } from 'rxjs';
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

    return this.generateToken(user)

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
  private async generateToken(user: User) {

    const accessToken = await this.signToken(user.id, this.authConfiguration.jwtAccessExpiration!, this.authConfiguration.jwtAccessSecret!, { email: user.email })
    const refreshToken = await this.signToken(user.id, this.authConfiguration.jwtRefreshExpiration!, this.authConfiguration.jwtRefreshSecret!)
    const resetPswToken = await this.signToken(user.id, this.authConfiguration.jwtResetPswExpiration!, this.authConfiguration.jwtResetPswSecret!)
    return {
      accessToken,
      refreshToken,
      resetPswToken
    }
  }

  async forgotPassword(forgotPsw: ForgotPswDto) {
    const user = await this.usersService.findByEmail(forgotPsw);
    if (!user) {
      // Don’t reveal if email exists for security
      console.log(`Password reset requested for non-existent email: ${forgotPsw.email}`);
      return;
    }
    // Generate short-lived reset token
    const tokens = await this.generateToken(user)
    const { resetPswToken } = tokens
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

    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new BadRequestException('Reset token has expired. Please request a new one.');
      } else {
        console.log(error.message);
        throw error
      }
    }

  }
}
