import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { appSetup } from './configs/app.config';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Получаем валидированную конфигурацию
  const configService = app.get(ConfigService);
  const PORT = configService.get<number>('PORT')!;
  const NODE_ENV = configService.get<string>('NODE_ENV')!;
  const DATABASE_URL = configService.get<string>('DATABASE_URL')!;

  console.log(`🚀 Starting application in ${NODE_ENV} mode`);
  console.log(`📊 Database: ${DATABASE_URL}`);

  appSetup(app, configService);

  await app.listen(PORT, '0.0.0.0');
  console.log(`✅ Application is running on port ${PORT}`);
}
void bootstrap();
