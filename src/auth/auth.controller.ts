import { Body, Controller, Post, Res, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersDto } from 'src/users/dto/users.dto';
import { LoginDto } from './dto/login.dto';
import { AllowAnonymous } from 'src/decorators/public.decorator';
import { Response } from 'express';

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
    return { message: 'Login successful' };
  }
}
