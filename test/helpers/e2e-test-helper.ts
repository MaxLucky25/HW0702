/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { appSetup } from '../../src/configs/app.config';
import { Server } from 'http';
import request from 'supertest';

export interface E2ETestSetupOptions {
  overrideProviders?: Array<{
    provide: any;
    useValue: any;
  }>;
}

export class E2ETestHelper {
  static async createTestingApp(options: E2ETestSetupOptions = {}): Promise<{
    app: INestApplication;
    server: Server;
  }> {
    const testingModuleBuilder = Test.createTestingModule({
      imports: [AppModule],
    });

    // Применяем override providers если есть
    if (options.overrideProviders) {
      options.overrideProviders.forEach(({ provide, useValue }) => {
        testingModuleBuilder.overrideProvider(provide).useValue(useValue);
      });
    }

    const moduleFixture: TestingModule = await testingModuleBuilder.compile();

    const app = moduleFixture.createNestApplication();

    // Mock ConfigService для тестов
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'testing';
        if (key === 'ADMIN_LOGIN') return 'admin';
        if (key === 'ADMIN_PASSWORD') return 'qwerty';
        return undefined;
      }),
    };

    appSetup(app, mockConfigService as any);

    await app.init();

    const server = app.getHttpServer() as Server;

    // Очищаем тестовые данные
    await request(server).delete('/testing/all-data').expect(204);

    return { app, server };
  }

  static async cleanup(app: INestApplication, server: Server): Promise<void> {
    try {
      await request(server).delete('/testing/all-data').expect(204);
    } catch (error) {
      // Игнорируем ошибки при очистке, если приложение уже закрывается
      console.warn('Error during cleanup:', error);
    }
    await app.close();
  }
}
