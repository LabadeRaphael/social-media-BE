import { Body, Controller, Post, Req, Res} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AllowAnonymous } from 'src/decorators/public.decorator';
import { Response, Request } from 'express';
import { ForgotPswDto } from './dto/forgot-psw.dto';
import { ResetPasswordDto } from './dto/reset-psw.dto';
import { CookiesService } from './cookies.service';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookiesService,
  ) { }
  @AllowAnonymous()
  @Post('signup')
  async createUser(@Body() user: RegisterDto) {
    await this.authService.register(user);
    return { message: 'Signup successful', status: true };
  }
  @AllowAnonymous()
  @Post('login')
  async login(@Body() login: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.login(login);
    const { accessToken, refreshToken } = tokens
    this.cookieService.setAuthCookie(res, 'accessToken', accessToken, 1000 * 60 * 60); // 1h
    this.cookieService.setAuthCookie(res, 'refreshToken', refreshToken, 7 * 24 * 60 * 60 * 1000); // 7d
    // return { message: 'Login successful', status: true, access_token:token.accessToken, refreshToken:token.refreshToken};
    return { message: 'Login successful', status: true, };
  }

  @AllowAnonymous()
  @Post('forgot-password')
  async forgotPassword(
   @Req() req: Request & { user: { sub: string } },
  @Body() forgotPsw: ForgotPswDto) {
    await this.authService.forgotPassword(forgotPsw);
    return { message: 'If your email is registered, you will receive a reset link shortly.', status: true };
  }

  @AllowAnonymous()
  @Post('reset-password')
  async resetPassword(
    @Body() resetPsw: ResetPasswordDto, 
    @Res({ passthrough: true }) res: Response) {
    
    await this.authService.resetPassword(resetPsw);
    this.cookieService.clearCookie(res, 'refreshToken');
    this.cookieService.clearCookie(res, 'accessToken');
    return { message: 'Password reset successful', status: true };
  }

  @AllowAnonymous()
  @Post('refresh-token')
  async refreshToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const oldRefreshToken = this.cookieService.getAuthCookie(req, 'refreshToken');
    console.log("refresh token", oldRefreshToken);
    const { refreshToken } = await this.authService.refreshToken(oldRefreshToken);
    this.cookieService.setAuthCookie(res, 'refreshToken', refreshToken, 7 * 24 * 60 * 60 * 1000); // 7d
    return { message: 'Refresh token generation successful', status: true };
  }
  @AllowAnonymous()
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = this.cookieService.getAuthCookie(req, 'refreshToken');
    console.log("refresh token", refreshToken);

    await this.authService.logout(refreshToken);
    this.cookieService.clearCookie(res, 'refreshToken');
    this.cookieService.clearCookie(res, 'accessToken');
    return { message: 'Logout successful', status: true };
  }
}
