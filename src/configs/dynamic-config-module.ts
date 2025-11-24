import { ConfigModule } from '@nestjs/config';
import defaultsConfig from './defaults.config';
import { validateEnvironment } from './validation/env.validation';

// You must import this const in the head of you app.modules.
export const configModule = ConfigModule.forRoot({
  envFilePath: [
    ...(process.env.ENV_FILE_PATH ? [process.env.ENV_FILE_PATH.trim()] : []),
    'env/.env.production',
    'env/.env.development',
    'env/.env.testing',
  ],
  isGlobal: true,
  load: [defaultsConfig],
  validate: validateEnvironment,
});
