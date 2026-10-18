import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({

  // JWT configuration
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtResetPswSecret: process.env.JWT_RESETPSW_SECRET,
  jwtChangeEmailSecret: process.env.JWT_CHANGE_EMAIL_SECRET,
  jwtRecoverAccountSecret: process.env.JWT_RECOVER_ACT_SECRET,
  jwtAccessExpiration: process.env.JWT_ACCESS_EXPIRATION,
  jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION,
  jwtResetPswExpiration: process.env.JWT_RESETPSW_EXPIRATION,
  jwtChangeEmailExpiration: process.env.JWT_CHANGE_EMAIL_EXPIRATION,
  jwtAudience: process.env.JWT_TOKEN_AUDIENCE || 'nestfinity',
  jwtIssuer: process.env.JWT_TOKEN_ISSUER || 'nestfinity',

   // Google OAuth / OpenID Connect
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleCallbackUrl:
    process.env.GOOGLE_CALLBACK_URL ||
    'http://localhost:3003/auth/google/callback',

  // Frontend redirect after authentication
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
}));



