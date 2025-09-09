import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtResetPswSecret: process.env.JWT_RESETPSW_SECRET,
  jwtAccessExpiration: process.env.JWT_ACCESS_EXPIRATION,
  jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION,
  jwtResetPswExpiration: process.env.JWT_RESETPSW_EXPIRATION,
  jwtAudience: process.env.JWT_TOKEN_AUDIENCE || 'nestfinity',
  jwtIssuer: process.env.JWT_TOKEN_ISSUER || 'nestfinity',
}));



