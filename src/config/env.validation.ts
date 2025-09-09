import * as Joi from 'joi';
export const envValidator = Joi.object({
  // App
  PORT: Joi.number().default(3003),
  NODE_ENV: Joi.string().valid('development', 'production').default('development'),

  // Database
  DATABASE_URL: Joi.string().uri().required(),

  // Prisma (optional)
  PRISMA_QUERY_ENGINE_BINARY: Joi.string().uri().optional(),
  // Auth
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_RESETPSW_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRATION: Joi.string().default('1h'),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
  JWT_RESETPSW_EXPIRATION: Joi.string().default('15m'),
  JWT_TOKEN_AUDIENCE:Joi.string().default('Nestfinity'),
  JWT_TOKEN_ISSUER:Joi.string().default('Nestfinity')
});
