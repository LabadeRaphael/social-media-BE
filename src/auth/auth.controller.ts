import { Body, Controller, Post, Res, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersDto } from 'src/users/dto/users.dto';
import { LoginDto } from './dto/login.dto';
import { AllowAnonymous } from 'src/decorators/public.decorator';
import { Response } from 'express';
import { ForgotPswDto } from './dto/forgot-psw.dto';
import { ResetPasswordDto } from './dto/reset-psw.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService
  ) {}
  @AllowAnonymous()
  @Post('signup')
  createUser(@Body(new ValidationPipe()) user: UsersDto) {
    return this.authService.register(user);    
  }
  @AllowAnonymous()
  @Post('login')
  async login(@Body(new ValidationPipe()) login: LoginDto, @Res({passthrough:true}) res: Response) {
    const token = await this.authService.login(login);
    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60,
    });
    // return { message: 'Login successful', status: true, access_token:token.accessToken, refreshToken:token.refreshToken};
    return { message: 'Login successful', status: true,};
  }
  
  @AllowAnonymous()
  @Post('forgot-password')
  async forgotPassword (@Body(new ValidationPipe()) forgotPsw:ForgotPswDto){
    return this.authService.forgotPassword(forgotPsw);
  }
  
   @AllowAnonymous()
   @Post('reset-password')
  async resetPassword(@Body(new ValidationPipe()) resetPsw: ResetPasswordDto) {
    return this.authService.resetPassword(resetPsw);
  }
}
