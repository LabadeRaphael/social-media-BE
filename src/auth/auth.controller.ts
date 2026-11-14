import { GoogleOidcService } from './google/google-oidc.service';
import * as oidc from 'openid-client';
import authConfig from 'src/config/auth.config';
import { BadRequestException, Body, Controller, ForbiddenException, Get, Inject, InternalServerErrorException, Post, Put, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
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
import { ConflictException } from '@nestjs/common';
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

  // @AllowAnonymous()
  // @Get('google')
  // async googleLogin(
  //   @Res({ passthrough: true }) res: Response,
  //   @Query('intent') intent?: string,
  // ) {

  //   const allowedIntents = ['login', 'delete-account'];

  //   if (intent && !allowedIntents.includes(intent)) {
  //     throw new BadRequestException('Invalid Google authorization intent.');
  //   }

  //   const authorizationIntent = intent ?? 'login';

  //   const {
  //     authorizationUrl,
  //     state,
  //     nonce,
  //     codeVerifier,
  //     intent: storedIntent,
  //   } = await this.googleOidcService.createAuthorizationRequest(authorizationIntent as 'login' | 'delete-account',);
  //   console.log(authorizationUrl);

  //   const maxAge = 5 * 60 * 1000;

  //   this.cookieService.setOAuthCookie(
  //     res,
  //     'google_oauth_state',
  //     state,
  //     maxAge,
  //   );

  //   this.cookieService.setOAuthCookie(
  //     res,
  //     'google_oauth_nonce',
  //     nonce,
  //     maxAge,
  //   );

  //   this.cookieService.setOAuthCookie(
  //     res,
  //     'google_oauth_code_verifier',
  //     codeVerifier,
  //     maxAge,
  //   );

  //   res.cookie('google_oauth_intent', storedIntent, cookieOptions);

  //   return res.redirect(authorizationUrl.href);
  // }
  @AllowAnonymous()
  @Get('google')
  async googleLogin(
    @Res({ passthrough: true }) res: Response,
  ) {
    const {
      authorizationUrl,
      state,
      nonce,
      codeVerifier,
      intent,
    } = await this.googleOidcService.createAuthorizationRequest('login');

    const maxAge = 5 * 60 * 1000;

    this.cookieService.setOAuthCookie(
      res, 'google_oauth_state', state, maxAge,
    );

    this.cookieService.setOAuthCookie(
      res, 'google_oauth_nonce', nonce, maxAge,
    );

    this.cookieService.setOAuthCookie(
      res, 'google_oauth_code_verifier', codeVerifier, maxAge,
    );

    this.cookieService.setOAuthCookie(
      res, 'google_oauth_intent', intent, maxAge,
    );

    return res.redirect(authorizationUrl.href);
  }

  @Get('google/reauthenticate')
  async googleReauthenticate(
    @Req() req: Request & { user: { sub: string } },
    @Res({ passthrough: true }) res: Response,
    @Query('intent') intent?: string,
  ) {
    const allowedIntents = ['delete-account', 'change-email'];

    if (intent && !allowedIntents.includes(intent)) {
      throw new BadRequestException(
        'Invalid Google reauthentication intent.',
      );
    }
    const authorizationIntent =
      intent ?? 'delete-account';
    const {
      authorizationUrl,
      state,
      nonce,
      codeVerifier,
      intent: storedIntent,
    } = await this.googleOidcService.createAuthorizationRequest(
      authorizationIntent as 'delete-account' | 'change-email',
    );

    const maxAge = 5 * 60 * 1000;

    this.cookieService.setOAuthCookie(
      res, 'google_oauth_state', state, maxAge,
    );

    this.cookieService.setOAuthCookie(
      res, 'google_oauth_nonce', nonce, maxAge,
    );

    this.cookieService.setOAuthCookie(
      res, 'google_oauth_code_verifier', codeVerifier, maxAge,
    );

    this.cookieService.setOAuthCookie(
      res, 'google_oauth_intent', storedIntent, maxAge,
    );

    this.cookieService.setOAuthCookie(
      res, 'google_oauth_user_id', req.user.sub, maxAge,
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
    const intent = this.cookieService.getAuthCookie(
      req,
      'google_oauth_intent',
    );
    const oauthUserId = this.cookieService.getAuthCookie(
      req,
      'google_oauth_user_id',
    );
    let redirectUrl = `${this.authConfiguration.frontendUrl}/dashboard/chats`;
    try {
      // 2. Check whether Google returned an error.
      if (typeof req.query.error === 'string') {
        throw new UnauthorizedException(
          'Google sign-in was cancelled or denied',
        );
      }
      if (intent !== 'login' && intent !== 'change-email' && intent !== 'delete-account') {
        throw new UnauthorizedException(
          'Invalid Google authentication session.',
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

      // // 11. Authenticate the user through Nestfinity.
      // const {
      //   accessToken,
      //   refreshToken,
      //   accessTokenExpireAt,
      // } = await this.authService.loginWithGoogle({
      //   googleId: claims.sub,
      //   email,
      //   emailVerified: true,
      //   picture: profilePicture,
      // });

      // 11. Handle the requested Google authentication intent.
      if (intent === 'delete-account') {
        if (!oauthUserId) {
          throw new UnauthorizedException(
            'Google authentication session has expired.',
          );
        }

        // Retrieve the existing Nestfinity access token.
        const accessToken = this.cookieService.getAuthCookie(
          req,
          'accessToken',
        );

        if (!accessToken) {
          throw new UnauthorizedException(
            'Your Nestfinity session has expired. Please sign in again.',
          );
        }

        // Verify the existing Nestfinity session.
        const payload = await this.jwtService.verifyAsync<{ sub: string }>(
          accessToken,
          {
            secret: this.authConfiguration.jwtAccessSecret,
            audience: this.authConfiguration.jwtAudience,
            issuer: this.authConfiguration.jwtIssuer,
          },
        );

        // Ensure this is the same user who initiated reauthentication.
        if (payload.sub !== oauthUserId) {
          throw new ForbiddenException(
            'Your account verification session does not match.',
          );
        }

        // Google identity-to-account verification comes next.
        const isGoogleAccountLinked =
          await this.authService.isGoogleAccountLinked(
            oauthUserId,
            claims.sub,
          );

        if (!isGoogleAccountLinked) {
          throw new ForbiddenException(
            'This Google account is not linked to your Nestfinity account.',
          );
        }
        await this.authService.softDeleteUserWithGoogle(
          oauthUserId,
          claims.sub,
        );

        // Clear the user's Nestfinity authentication cookies.
        this.cookieService.clearCookie(res, 'accessToken');
        this.cookieService.clearCookie(res, 'refreshToken');
        redirectUrl = new URL(
          'auth/login?success=account_deleted',
          this.authConfiguration.frontendUrl,
        ).toString();


      } else if (intent === 'change-email') {
        const maxAge = 5 * 60 * 1000;
        if (!oauthUserId) {
          throw new UnauthorizedException(
            'Google authentication session has expired.',
          );
        }

        // 1. Retrieve the existing Nestfinity access token.
        const accessToken = this.cookieService.getAuthCookie(
          req,
          'accessToken',
        );

        if (!accessToken) {
          throw new UnauthorizedException(
            'Your Nestfinity session has expired. Please sign in again.',
          );
        }

        // 2. Verify the Nestfinity session.
        const payload = await this.jwtService.verifyAsync<{ sub: string }>(
          accessToken,
          {
            secret: this.authConfiguration.jwtAccessSecret,
            audience: this.authConfiguration.jwtAudience,
            issuer: this.authConfiguration.jwtIssuer,
          },
        );

        // 3. Ensure the same user initiated reauthentication.
        if (payload.sub !== oauthUserId) {
          throw new ForbiddenException(
            'Your account verification session does not match.',
          );
        }

        // 4. Verify that this Google account belongs to this user.
        const isGoogleAccountLinked =
          await this.authService.isGoogleAccountLinked(
            oauthUserId,
            claims.sub,
          );

        if (!isGoogleAccountLinked) {
          throw new ForbiddenException(
            'This Google account is not linked to your Nestfinity account.',
          );
        }

        // 5. Generate a single-use reauthentication proof.
        const proof = await this.authService.generateReauthenticationProof(
          oauthUserId,
          'change-email',
        );

        // 6. Store the proof in an HTTP-only cookie.
        this.cookieService.setOAuthCookie(
          res,
          'google_reauth_proof',
          proof,
          maxAge
        );

        // Reauthentication succeeded.
        // The single-use proof will be issued here in the next step.

        redirectUrl = new URL(
          'dashboard/chats?google_verified=change-email',
          this.authConfiguration.frontendUrl,
        ).toString();
      }
      else {
        // Normal Google login.
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
      }

    } catch (error) {
      console.error('Google OAuth callback failed:', error);
      let errorCode = 'google_auth_failed';
      // User cancelled or denied Google authorization.
      if (typeof req.query.error === 'string') {
        errorCode =
          req.query.error === 'access_denied'
            ? 'google_access_denied'
            : 'google_auth_failed';
      }

      // OAuth state or session validation failed.
      else if (error instanceof UnauthorizedException) {
        errorCode = 'google_session_invalid';
      }

      // Existing Nestfinity account.
      else if (error instanceof ConflictException) {
        errorCode = 'google_account_exists';
      }

      // Account or email verification restrictions.
      else if (error instanceof ForbiddenException) {
        const response = error.getResponse();

        const code =
          typeof response === 'object' && response !== null
            ? (response as { code?: string }).code
            : undefined;

        if (code === 'GOOGLE_ACCOUNT_DELETED') {
          errorCode = 'google_account_deleted';
        } else if (code === 'GOOGLE_EMAIL_UNVERIFIED') {
          errorCode = 'google_email_unverified';
        } else if (intent === 'delete-account') {
          errorCode = 'google_delete_verification_failed';
        }
      }

      const destination =
        intent === 'delete-account'
          ? 'dashboard/settings'
          : 'auth/login';

      const errorUrl = new URL(
        destination,
        this.authConfiguration.frontendUrl,
      );

      errorUrl.searchParams.set('error', errorCode);
      redirectUrl = errorUrl.toString();
    }
    finally {
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
      this.cookieService.clearOAuthCookie(
        res,
        'google_oauth_intent',
      );

      this.cookieService.clearOAuthCookie(
        res,
        'google_oauth_user_id',
      );
    }
    return res.redirect(redirectUrl);
    // 14. Redirect only after cookie cleanup is complete.
    // return res.redirect(`${this.authConfiguration.frontendUrl}/dashboard/chats`);
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
  // @Post('request-email-change')
  // requestEmailChange(
  //   @Req() req: Request & { user: { sub: string } },
  //   @Body() dto: RequestEmailChangeDto,
  // ) {
  //   console.log("request-email-change");

  //   const userId = req?.user?.sub
  //   return this.authService.requestEmailChange(userId, dto);
  // }
  @Post('request-email-change')
  async requestEmailChange(
    @Req() req: Request & {
      user: { sub: string };
      // cookies?: Record<string, string>;
    },
    @Body() dto: RequestEmailChangeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = req.user.sub;

    const proof = this.cookieService.getAuthCookie(
      req,
      'google_reauth_proof',
    );

    const result = await this.authService.requestEmailChange(
      userId,
      dto,
      proof,
    );

    if (proof) {
      this.cookieService.clearOAuthCookie(
        res,
        'google_reauth_proof',
      );
    }

    return result;
  }
  @AllowAnonymous()
  @Post('verify-email-change')
  async verifyEmailChange
    (@Body() token: VerifyEmailChangeDto) {
    console.log("verify-email-change");

    return this.authService.verifyEmailChange(token);
  }

}