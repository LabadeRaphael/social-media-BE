import { sendResetPasswordEmail } from './../utils/mailer';
import { BadRequestException, Body, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ConfigType } from '@nestjs/config';
import authConfig from 'src/config/auth.config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ForgotPswDto } from './dto/forgot-psw.dto';
import { ResetPasswordDto } from './dto/reset-psw.dto';
import { ActiveUserType } from 'src/interfaces/active-user-type';
import { User } from 'generated/prisma';
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
    // const token = await this.jwtService.signAsync({
    //   sub: user.id,
    //   email: user.email,
    // }, {
    //   secret: this.authConfiguration.jwtSecret,
    //   expiresIn: this.authConfiguration.jwtExpiration,
    //   audience: this.authConfiguration.audience,
    //   issuer: this.authConfiguration.audience
    // })
    // return {
    //   token
    // }
    return this.generateToken(user)

  }
  private async signToken<T> ( userId: string, expiresIn: string, payload?: T, ){
    return this.jwtService.signAsync({
      sub: userId,
      ...payload
    }, {
      secret: this.authConfiguration.jwtSecret,
      expiresIn: expiresIn,
      audience: this.authConfiguration.audience,
      issuer: this.authConfiguration.audience
    })
  }
  private async generateToken(user: User){
  
    const accessToken = await this.signToken(user.id, this.authConfiguration.jwtExpiration!, {email:user.email})
    const refreshToken = await this.signToken(user.id, this.authConfiguration.refreshExpiration!)
    const resetPswToken = await this.signToken(user.id, this.authConfiguration.resetPswExpiration!)
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
      return { message: 'If your email is registered, you will receive a reset link shortly.' };
    }   
    // Generate short-lived reset token
    const tokens = await this.generateToken(user)
    // const token = await this.jwtService.signAsync(
    //   { email: user.email },
    //   { secret: process.env.JWT_SECRET, expiresIn: '15m' },
    // );
    const { resetPswToken } = tokens
    console.log(resetPswToken);
    

    // Send email with nodemailer util
    await sendResetPasswordEmail(user.email, resetPswToken);         

  }
  async resetPassword(resetPsw: ResetPasswordDto) {
      const payload = await this.jwtService.verifyAsync(resetPsw.token, {
        secret: this.authConfiguration.jwtSecret,
      });
    const user = await this.usersService.updatePassword(resetPsw);
    if (!user) {
      throw new BadRequestException('Invalid token or user not found');
    }
 
  }
}
