import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiration: process.env.JWT_EXPIRATION,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  refreshExpiration: process.env.JWT_REFRESH_EXPIRATION,
  resetPswExpiration: process.env.JWT_RESETPSW_EXPIRATION,
  audience: process.env.JWT_TOKEN_AUDIENCE || 'nestfinity',
  issuer: process.env.JWT_TOKEN_ISSUER || 'nestfinity',
}));



