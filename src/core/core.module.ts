import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllHttpExceptionsFilter } from './exceptions/filters/all-exception.filter';
import { DomainHttpExceptionsFilter } from './exceptions/filters/domain-exceptions.filter';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UuidValidationPipe } from './pipes/uuid-validator-transformation-pipe-service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        ssl: {
          rejectUnauthorized: false, // Для Neon
        },
        autoLoadEntities: true,
        synchronize: true, // Важно: не автоматически синхронизировать схему
        logging: configService.get<string>('NODE_ENV') === 'development', // Логи только в dev
      }),
    }),
  ],
  providers: [
    // Глобальные фильтры исключений
    {
      provide: APP_FILTER,
      useClass: AllHttpExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: DomainHttpExceptionsFilter,
    },
    // Глобальный guard для throttling
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Pipes для валидации UUID
    UuidValidationPipe,
  ],
  exports: [
    // Экспортируем pipes для использования в других модулях
    UuidValidationPipe,
  ],
})
export class CoreModule {}
