import { EnvironmentVariables } from './validation/env.validation.schema';

export default (): Partial<EnvironmentVariables> => {
  return {
    NODE_ENV: process.env.NODE_ENV || 'testing',

    PORT: process.env.PORT ? parseInt(process.env.PORT) : 3004,

    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN
      ? parseInt(process.env.JWT_EXPIRES_IN)
      : 600,
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN
      ? parseInt(process.env.JWT_REFRESH_EXPIRES_IN)
      : 3600000, // 1 час

    EMAIL_CONFIRMATION_EXPIRATION: process.env.EMAIL_CONFIRMATION_EXPIRATION
      ? parseInt(process.env.EMAIL_CONFIRMATION_EXPIRATION)
      : 10,
    PASSWORD_RECOVERY_EXPIRATION: process.env.PASSWORD_RECOVERY_EXPIRATION
      ? parseInt(process.env.PASSWORD_RECOVERY_EXPIRATION)
      : 10,

    BCRYPT_SALT_ROUNDS: process.env.BCRYPT_SALT_ROUNDS
      ? parseInt(process.env.BCRYPT_SALT_ROUNDS)
      : 10,

    THROTTLE_LIMIT: process.env.THROTTLE_LIMIT
      ? parseInt(process.env.THROTTLE_LIMIT)
      : 5,
    THROTTLE_TTL: process.env.THROTTLE_TTL
      ? parseInt(process.env.THROTTLE_TTL)
      : 10000,
  };
};
