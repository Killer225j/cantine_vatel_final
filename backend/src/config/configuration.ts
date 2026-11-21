import * as Joi from 'joi';

/**
 * Variables d'environnement acceptées par l'API.
 *
 * Volontairement courte : tout ce qui est exigé ici doit exister sur Render, sinon l'API
 * refuse de démarrer. Une variable optionnelle a un défaut sûr.
 */
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  // Origines autorisées, séparées par des virgules (back-office local, back-office Vercel).
  CORS_ORIGINS: Joi.string().default('http://localhost:4200'),
});

export interface AppConfig {
  port: number;
  nodeEnv: string;
  database: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  cors: {
    origins: string[];
  };
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  database: {
    url: process.env.DATABASE_URL as string,
  },
  jwt: {
    secret: process.env.JWT_SECRET as string,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  cors: {
    origins: (process.env.CORS_ORIGINS ?? 'http://localhost:4200')
      .split(',')
      .map((origine) => origine.trim().replace(/\/+$/, ''))
      .filter(Boolean),
  },
});
