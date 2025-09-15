import { Body, Controller, Post, Res, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersDto } from 'src/users/dto/users.dto';
import { LoginDto } from './dto/login.dto';
import { AllowAnonymous } from 'src/decorators/public.decorator';
import { Response } from 'express';
import { ForgotPswDto } from './dto/forgot-psw.dto';
import { ResetPasswordDto } from './dto/reset-psw.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { CookiesService } from './cookies.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
     private readonly cookieService: CookiesService,
  ) {}
  @AllowAnonymous()
  @Post('signup')
  createUser(@Body(new ValidationPipe()) user: UsersDto) {
    return this.authService.register(user);    
  }
  @AllowAnonymous()
  @Post('login')
  async login(@Body(new ValidationPipe()) login: LoginDto, @Res({passthrough:true}) res: Response) {
    const tokens = await this.authService.login(login);
    const {accessToken, refreshToken} = tokens
    this.cookieService.setAuthCookie(res, 'accessToken', accessToken, 1000 * 60 * 60); // 1h
    this.cookieService.setAuthCookie(res, 'refreshToken', refreshToken, 7 * 24 * 60 * 60 * 1000); // 7d

    // res.cookie('accessToken', accessToken, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === 'production',
    //   sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    //   maxAge: 1000 * 60 * 60,
    // });
    // save in DB
    await this.authService.revokeAllRefreshTokens(refreshToken);


    // return { message: 'Login successful', status: true, access_token:token.accessToken, refreshToken:token.refreshToken};
    return { message: 'Login successful', status: true,};
  }
  
  @AllowAnonymous()
  @Post('forgot-password')
  async forgotPassword (@Body(new ValidationPipe()) forgotPsw:ForgotPswDto){
    await this.authService.forgotPassword(forgotPsw);
    return { message: 'If your email is registered, you will receive a reset link shortly.', status: true };
  }
  
  @AllowAnonymous()
  @Post('reset-password')
  async resetPassword(@Body(new ValidationPipe()) resetPsw: ResetPasswordDto,  @Res({ passthrough: true }) res:Response) {
    await this.authService.resetPassword(resetPsw);
    this.cookieService.clearCookie(res, 'refreshToken');
    this.cookieService.clearCookie(res, 'accessToken');
    return { message: 'Password reset successfully', status:true };
  }
  
  @AllowAnonymous()
  @Post('refresh-token')
  async refreshToken(@Body(new ValidationPipe()) refreshTokenDto: RefreshTokenDto, @Res({passthrough:true}) res: Response) {
  
     const { refreshToken } = await this.authService.refreshToken(refreshTokenDto);
      this.cookieService.setAuthCookie(res, 'refreshToken', refreshToken, 7 * 24 * 60 * 60 * 1000); // 7d
      // Set new refresh token as HttpOnly cookie
      // res.cookie('refreshToken', refreshToken , {
      //   httpOnly: true,
      //   secure: process.env.NODE_ENV === 'production',
      //   sameSite: 'none',
      //   maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      // });
    return { message: 'Refresh token successful', status:true };
  }
  @AllowAnonymous()
  @Post('logout')
  async logout(@Body(new ValidationPipe()) logout: LogoutDto, res:Response) {
    await this.authService.logout(logout);
   this.cookieService.clearCookie(res, 'refreshToken');
    return { message: 'Logout successful', status: true };
  }
}
