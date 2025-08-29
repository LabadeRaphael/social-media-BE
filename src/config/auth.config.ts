import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET || 'default_secret_key',
  jwtExpiration: process.env.JWT_EXPIRATION || '1h', // e.g. 1h, 30m, 7d
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
  refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
}));
