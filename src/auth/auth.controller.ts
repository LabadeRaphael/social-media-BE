import { GoogleOidcService } from './google/google-oidc.service';
import * as oidc from 'openid-client';
import authConfig from 'src/config/auth.config';
import { BadRequestException, Body, Controller, ForbiddenException, Get, Inject, InternalServerErrorException, Post, Put, Req, Res, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AllowAnonymous } from 'src/decorators/public.decorator';
import { Response, Request } from 'express';
import { ForgotPswDto } from './dto/forgot-psw.dto';
import { ResetPasswordDto } from './dto/reset-psw.dto';
import { CookiesService } from './cookies.service';
import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigType } from '@nestjs/config';
import * as ms from 'ms';
import { RecoverDto } from './dto/recover-account.dto';
import { VerifyActDto } from './dto/verify-account.dto';
import { RequestEmailChangeDto } from './dto/request-email-change.dto';
import { VerifyEmailChangeDto } from './dto/verify-email-change';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    @Inject(authConfig.KEY)
    private readonly authConfiguration: ConfigType<typeof authConfig>,
    private readonly cookieService: CookiesService,
    private readonly googleOidcService: GoogleOidcService,
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
    const accessExpirationMs = ms(this.authConfiguration.jwtAccessExpiration);
    const refreshExpirationMs = ms(this.authConfiguration.jwtRefreshExpiration);
    this.cookieService.setAuthCookie(res, 'accessToken', accessToken, accessExpirationMs);
    this.cookieService.setAuthCookie(res, 'refreshToken', refreshToken, refreshExpirationMs); // 7d
    return { message: 'Login successful', status: true };

  }

  @AllowAnonymous()
  @Get('google')
  async googleLogin(@Res() res: Response) {
    const {
      authorizationUrl,
      state,
      nonce,
      codeVerifier,
    } = await this.googleOidcService.createAuthorizationRequest();
    console.log(authorizationUrl);

    const maxAge = 5 * 60 * 1000;

    this.cookieService.setOAuthCookie(
      res,
      'google_oauth_state',
      state,
      maxAge,
    );

    this.cookieService.setOAuthCookie(
      res,
      'google_oauth_nonce',
      nonce,
      maxAge,
    );

    this.cookieService.setOAuthCookie(
      res,
      'google_oauth_code_verifier',
      codeVerifier,
      maxAge,
    );

    return res.redirect(authorizationUrl.href);
  }


  @AllowAnonymous()
  @Get('google/callback')
  async googleCallback(
    @Req() req: Request & {
      cookies?: Record<string, string>;
    },
    @Res() res: Response,
  ) {
    // 1. Retrieve the original OAuth values from cookies.
    const storedState = this.cookieService.getAuthCookie(
      req,
      'google_oauth_state',
    );

    const storedNonce = this.cookieService.getAuthCookie(
      req,
      'google_oauth_nonce',
    );

    const storedCodeVerifier = this.cookieService.getAuthCookie(
      req,
      'google_oauth_code_verifier',
    );

    try {
      // 2. Check whether Google returned an error.
      if (typeof req.query.error === 'string') {
        throw new UnauthorizedException(
          'Google sign-in was cancelled or denied',
        );
      }

      // 3. Validate the returned state.
      const returnedState = req.query.state;

      if (
        typeof returnedState !== 'string' ||
        !storedState ||
        returnedState !== storedState
      ) {
        throw new UnauthorizedException(
          'Invalid Google authentication request',
        );
      }

      // 4. Make sure the other security values exist.
      if (!storedNonce || !storedCodeVerifier) {
        throw new UnauthorizedException(
          'Google authentication session has expired',
        );
      }

      // 5. Make sure Google returned an authorization code.
      if (typeof req.query.code !== 'string') {
        throw new BadRequestException(
          'Google authorization code is missing',
        );
      }

      // 6. Confirm that the callback URL is configured.
      const redirectUri =
        this.authConfiguration.googleCallbackUrl;

      if (!redirectUri) {
        throw new InternalServerErrorException(
          'Google callback URL is not configured',
        );
      }

      // 7. Reconstruct Google's complete callback URL.
      const callbackUrl = new URL(req.originalUrl, redirectUri);

      // 8. Retrieve Google's OIDC configuration.
      const configuration =
        await this.googleOidcService.getConfiguration();

      // 9. Exchange the authorization code for tokens.
      const tokens = await oidc.authorizationCodeGrant(
        configuration,
        callbackUrl,
        {
          expectedState: storedState,
          expectedNonce: storedNonce,
          pkceCodeVerifier: storedCodeVerifier,
        },
      );

      // 10. Extract the validated Google ID token claims.
      const claims = tokens.claims();

      const email = claims?.email;
      const picture = claims?.picture;

      if (
        !claims?.sub ||
        typeof email !== 'string' ||
        claims.email_verified !== true
      ) {
        throw new ForbiddenException(
          'Google account email could not be verified.',
        );
      }

      const profilePicture =
        typeof picture === 'string' ? picture : undefined;

      // 11. Authenticate the user through Nestfinity.
      const {
        accessToken,
        refreshToken,
        accessTokenExpireAt,
      } = await this.authService.loginWithGoogle({
        googleId: claims.sub,
        email,
        emailVerified: true,
        picture: profilePicture,
      });

      // 12. Set Nestfinity authentication cookies.
      this.cookieService.setAuthCookie(
        res,
        'accessToken',
        accessToken,
        accessTokenExpireAt - Date.now(),
      );

      this.cookieService.setAuthCookie(
        res,
        'refreshToken',
        refreshToken,
        ms(this.authConfiguration.jwtRefreshExpiration!),
      );

    } finally {
      // 13. Clear temporary OAuth cookies BEFORE sending the response.
      this.cookieService.clearOAuthCookie(
        res,
        'google_oauth_state',
      );

      this.cookieService.clearOAuthCookie(
        res,
        'google_oauth_nonce',
      );

      this.cookieService.clearOAuthCookie(
        res,
        'google_oauth_code_verifier',
      );
    }

    // 14. Redirect only after cookie cleanup is complete.
    return res.redirect(`${this.authConfiguration.frontendUrl}/dashboard/chats`);
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
  @Post('recover-account')
  async recoverAccount(
    @Req() req: Request & { user: { sub: string } },
    @Body() recoverAct: RecoverDto) {
    await this.authService.recoverAccount(recoverAct);
    return {
      message: "If an account exists, you will receive an email with instructions.",
      status: true,
    };
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
  @Post('recover-account-verify')
  async verifyRecoverAccount
    (@Body() token: VerifyActDto) {
    return this.authService.verifyRecoverAccount(token);
  }

  @AllowAnonymous()
  @Post('refresh-token')
  async refreshToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const oldRefreshToken = this.cookieService.getAuthCookie(req, 'refreshToken');
    console.log("refresh token", oldRefreshToken);
    const { refreshToken, accessToken, accessTokenExpireAt } = await this.authService.refreshToken(oldRefreshToken);
    const accessExpirationMs = ms(this.authConfiguration.jwtAccessExpiration);
    const refreshExpirationMs = ms(this.authConfiguration.jwtRefreshExpiration);
    this.cookieService.setAuthCookie(res, 'accessToken', accessToken, accessExpirationMs);
    this.cookieService.setAuthCookie(res, 'refreshToken', refreshToken, refreshExpirationMs);
    return { message: 'Refresh token generation successful', status: true, accessTokenExpireAt };
  }
  // @AllowAnonymous()
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = this.cookieService.getAuthCookie(req, 'refreshToken');
    console.log("refresh token", refreshToken);

    await this.authService.logout(refreshToken);
    this.cookieService.clearCookie(res, 'refreshToken');
    this.cookieService.clearCookie(res, 'accessToken');
    return { message: 'Logout successful', status: true };
  }
  @Get('token-info')
  tokenInfo(@Req() req: Request) {
    const accessToken = this.cookieService.getAuthCookie(req, 'accessToken');

    if (!accessToken) {
      throw new UnauthorizedException('No access token provided');
    }

    try {
      const decoded = this.jwtService.verify(accessToken, {
        secret: this.authConfiguration.jwtAccessSecret,
        audience: this.authConfiguration.jwtAudience,
        issuer: this.authConfiguration.jwtIssuer
      });

      if (!decoded?.exp) {
        throw new UnauthorizedException('Invalid token payload');
      }

      // Convert expiration time from seconds to milliseconds
      const accessTokenExpireAt = decoded.exp * 1000;

      return { accessTokenExpireAt };
    } catch (err) {
      console.error('Token verification failed:', err);
      throw new UnauthorizedException('Access token invalid or expired');
    }
  }
  @Post('request-email-change')
  requestEmailChange(
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: RequestEmailChangeDto,
  ) {
    console.log("request-email-change");

    const userId = req?.user?.sub
    return this.authService.requestEmailChange(userId, dto);
  }

  @AllowAnonymous()
  @Post('verify-email-change')
  async verifyEmailChange
    (@Body() token: VerifyEmailChangeDto) {
    console.log("verify-email-change");

    return this.authService.verifyEmailChange(token);
  }

}