import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { pipesSetup } from './pipes.config';
import { setupSwagger } from './swagger.config';

export function appSetup(app: INestApplication, configService: ConfigService) {
  app.enableCors();
  app.use(cookieParser());
  pipesSetup(app);

  if (configService.get('NODE_ENV') !== 'production') {
    setupSwagger(app);
  }
}
