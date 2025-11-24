/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { TestingService } from '../../src/modules/testing/testing.service';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

export interface IntegrationTestSetupOptions {
  overrideProviders?: Array<{
    provide: any;
    useValue: any;
  }>;
}

export class IntegrationTestHelper {
  static async createTestingModule(
    options: IntegrationTestSetupOptions = {},
  ): Promise<{
    module: TestingModule;
    dataSource: DataSource;
  }> {
    const mockThrottlerGuard = {
      canActivate: jest.fn(() => true),
    };

    const testingModuleBuilder = Test.createTestingModule({
      imports: [AppModule],
    });

    // Применяем override providers если есть
    if (options.overrideProviders) {
      options.overrideProviders.forEach(({ provide, useValue }) => {
        testingModuleBuilder.overrideProvider(provide).useValue(useValue);
      });
    }

    // Мокируем ThrottlerGuard для интеграционных тестов
    testingModuleBuilder
      .overrideGuard(ThrottlerGuard)
      .useValue(mockThrottlerGuard);

    // Переопределяем APP_GUARD, который регистрируется в CoreModule
    testingModuleBuilder
      .overrideProvider(APP_GUARD)
      .useValue([mockThrottlerGuard]);

    const module = await testingModuleBuilder.compile();

    const dataSource = module.get(DataSource);
    const testingService = module.get(TestingService);

    // Очищаем тестовые данные
    await testingService.clearAllTables();

    return { module, dataSource };
  }

  static async cleanup(module: TestingModule | undefined): Promise<void> {
    if (!module) {
      return;
    }

    try {
      const testingService = module.get(TestingService);
      await testingService.clearAllTables();
    } catch (error) {
      // Игнорируем ошибки при cleanup, если модуль уже закрыт
      console.warn('Error during cleanup:', error);
    }

    try {
      await module.close();
    } catch (error) {
      // Игнорируем ошибки при закрытии модуля
      console.warn('Error during module close:', error);
    }
  }
}
