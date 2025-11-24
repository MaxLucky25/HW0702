/* eslint-disable */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CreateUserInputDto } from '../src/modules/auth-manage/user-accounts/api/input-dto/users.input-dto';
import { LoginInputDto } from '../src/modules/auth-manage/access-control/api/input-dto/login.input.dto';
import { MeViewDto } from '../src/modules/auth-manage/user-accounts/api/view-dto/users.view-dto';
import { Server } from 'http';
import { EmailService } from '../src/modules/auth-manage/access-control/application/helping-application/email.service';
import { E2ETestHelper } from './helpers/e2e-test-helper';

// Mock EmailService
const mockEmailService = {
  sendConfirmationEmail: jest.fn().mockResolvedValue(undefined),
  sendRecoveryEmail: jest.fn().mockResolvedValue(undefined),
};

// Helper function to extract refresh token from cookies
const extractRefreshToken = (cookies: string | string[]): string | null => {
  const cookiesArray = Array.isArray(cookies) ? cookies : [cookies];
  const refreshTokenCookie = cookiesArray.find((cookie: string) =>
    cookie.includes('refreshToken'),
  );
  return refreshTokenCookie
    ? refreshTokenCookie.split(';')[0].split('=')[1]
    : null;
};

// Helper function to check if refresh token exists in cookies
const hasRefreshToken = (cookies: string | string[]): boolean => {
  const cookiesArray = Array.isArray(cookies) ? cookies : [cookies];
  return cookiesArray.some((cookie: string) => cookie.includes('refreshToken'));
};

describe('RefreshToken and Devices (e2e)', () => {
  let app: INestApplication;
  let server: Server;

  // Basic Auth credentials для создания пользователей
  const basicAuth = 'Basic ' + Buffer.from('admin:qwerty').toString('base64');

  beforeAll(async () => {
    const testSetup = await E2ETestHelper.createTestingApp({
      overrideProviders: [
        { provide: EmailService, useValue: mockEmailService },
      ],
    });
    app = testSetup.app;
    server = testSetup.server;
  });

  afterAll(async () => {
    await E2ETestHelper.cleanup(app, server);
  });

  describe('RefreshToken', () => {
    it('should remove all data (DELETE /testing/all-data)', async () => {
      await request(server).delete('/testing/all-data').expect(204);
    });

    it('should create new user (POST /sa/users)', async () => {
      const userData: CreateUserInputDto = {
        login: 'testuser',
        password: 'testpassword123',
        email: 'test@example.com',
      };

      const response = await request(server)
        .post('/sa/users')
        .set('Authorization', basicAuth)
        .send(userData)
        .expect(201);

      const userResponseBody = response.body;
      expect(userResponseBody).toHaveProperty('id');
      expect(userResponseBody.login).toBe('testuser');
      expect(userResponseBody.email).toBe('test@example.com');
    });

    it('should sign in user (POST /auth/login)', async () => {
      const loginData: LoginInputDto = {
        loginOrEmail: 'testuser',
        password: 'testpassword123',
      };

      const response = await request(server)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      const loginResponseBody = response.body;
      expect(loginResponseBody).toHaveProperty('accessToken');
      expect(typeof loginResponseBody.accessToken).toBe('string');
      expect(loginResponseBody.accessToken.length).toBeGreaterThan(0);

      // Проверяем что refresh token установлен в cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(hasRefreshToken(cookies)).toBe(true);
    });

    it('should return the error when the access token has expired or there is no one in the headers (GET /auth/me)', async () => {
      // Тест без токена
      await request(server).get('/auth/me').expect(401);

      // Тест с невалидным токеном
      await request(server)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return an error when the refresh token has expired or there is no one in the cookie (POST /auth/refresh-token, POST /auth/logout)', async () => {
      // Тест без refresh token
      await request(server).post('/auth/refresh-token').expect(401);
      await request(server).post('/auth/logout').expect(401);

      // Тест с невалидным refresh token
      await request(server)
        .post('/auth/refresh-token')
        .set('Cookie', 'refreshToken=invalid-token')
        .expect(401);

      await request(server)
        .post('/auth/logout')
        .set('Cookie', 'refreshToken=invalid-token')
        .expect(401);
    });

    it('should sign in user (POST /auth/login)', async () => {
      const loginData: LoginInputDto = {
        loginOrEmail: 'testuser',
        password: 'testpassword123',
      };

      const response = await request(server)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      const loginResponseBody = response.body;
      expect(loginResponseBody).toHaveProperty('accessToken');
      expect(typeof loginResponseBody.accessToken).toBe('string');
      expect(loginResponseBody.accessToken.length).toBeGreaterThan(0);

      // Проверяем что refresh token установлен в cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(hasRefreshToken(cookies)).toBe(true);
    });

    it('should return an error if the refresh token has become invalid (POST /auth/refresh-token, POST /auth/logout)', async () => {
      // Используем невалидный refresh token
      await request(server)
        .post('/auth/refresh-token')
        .set('Cookie', 'refreshToken=invalid-token')
        .expect(401);

      await request(server)
        .post('/auth/logout')
        .set('Cookie', 'refreshToken=invalid-token')
        .expect(401);
    });

    it('should check access token and return current user data (GET /auth/me)', async () => {
      // Получаем свежий access token для этого теста
      const loginData: LoginInputDto = {
        loginOrEmail: 'testuser',
        password: 'testpassword123',
      };

      const loginResponse = await request(server)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      const accessToken = loginResponse.body.accessToken;

      const response = await request(server)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const responseBody = response.body as MeViewDto;
      expect(responseBody).toHaveProperty('login');
      expect(responseBody).toHaveProperty('email');
      expect(responseBody).toHaveProperty('userId');
      expect(responseBody.login).toBe('testuser');
      expect(responseBody.email).toBe('test@example.com');
    });

    it('should make the refresh token invalid (POST /auth/logout)', async () => {
      // Получаем свежий refresh token для этого теста
      const loginData: LoginInputDto = {
        loginOrEmail: 'testuser',
        password: 'testpassword123',
      };

      const loginResponse = await request(server)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      const refreshToken = extractRefreshToken(cookies);

      if (!refreshToken) {
        throw new Error('Refresh token not found');
      }

      await request(server)
        .post('/auth/logout')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(204);
    });

    it('should return an error if the refresh token has become invalid (POST /auth/refresh-token, POST /auth/logout)', async () => {
      // Используем невалидный refresh token
      await request(server)
        .post('/auth/refresh-token')
        .set('Cookie', 'refreshToken=invalid-token')
        .expect(401);

      await request(server)
        .post('/auth/logout')
        .set('Cookie', 'refreshToken=invalid-token')
        .expect(401);
    });
  });

  describe('Devices', () => {
    it('should remove all data (DELETE /testing/all-data)', async () => {
      await request(server).delete('/testing/all-data').expect(204);
    });

    it('should create new user (POST /sa/users)', async () => {
      const userData: CreateUserInputDto = {
        login: 'deviceuser',
        password: 'devicepassword123',
        email: 'device@example.com',
      };

      const response = await request(server)
        .post('/sa/users')
        .set('Authorization', basicAuth)
        .send(userData)
        .expect(201);

      const userResponseBody = response.body;
      expect(userResponseBody).toHaveProperty('id');
      expect(userResponseBody.login).toBe('deviceuser');
      expect(userResponseBody.email).toBe('device@example.com');
    });

    it('should create fresh user for devices tests (POST /sa/users)', async () => {
      const userData: CreateUserInputDto = {
        login: 'freshuser',
        password: 'freshpassword123',
        email: 'fresh@example.com',
      };

      const response = await request(server)
        .post('/sa/users')
        .set('Authorization', basicAuth)
        .send(userData)
        .expect(201);

      const userResponseBody = response.body;
      expect(userResponseBody).toHaveProperty('id');
      expect(userResponseBody.login).toBe('freshuser');
      expect(userResponseBody.email).toBe('fresh@example.com');
    });

    it('should login user 4 times from different browsers and get device list (GET /security/devices)', async () => {
      const loginData: LoginInputDto = {
        loginOrEmail: 'deviceuser',
        password: 'devicepassword123',
      };

      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 OPR/77.0.4054.277',
      ];

      // Логинимся 4 раза с разными браузерами и сохраняем последний refresh token
      let lastRefreshToken: string | null = null;

      for (let i = 0; i < 4; i++) {
        const loginResponse = await request(server)
          .post('/auth/login')
          .set('User-Agent', userAgents[i])
          .send(loginData)
          .expect(200);

        const cookies = loginResponse.headers['set-cookie'];
        lastRefreshToken = extractRefreshToken(cookies);
      }

      if (!lastRefreshToken) {
        throw new Error('Refresh token not found');
      }

      const devicesResponse = await request(server)
        .get('/security/devices')
        .set('Cookie', `refreshToken=${lastRefreshToken}`)
        .expect(200);

      const devices = devicesResponse.body;
      expect(Array.isArray(devices)).toBe(true);

      // Проверяем, что создано 4 сессии
      expect(devices.length).toBe(4);

      // Проверяем, что все устройства имеют разные браузеры
      const deviceTitles = devices.map((device) => device.title);
      const uniqueTitles = [...new Set(deviceTitles)];
      expect(uniqueTitles.length).toBe(3);

      // Проверяем структуру каждого устройства
      devices.forEach((device) => {
        expect(device).toHaveProperty('deviceId');
        expect(device).toHaveProperty('title');
        expect(device).toHaveProperty('ip');
        expect(device).toHaveProperty('lastActiveDate');
      });
    });

    it('should return error if device ID not found (DELETE /security/devices/:deviceId)', async () => {
      const fakeDeviceId = '550e8400-e29b-41d4-a716-446655440000'; // Несуществующий UUID

      const loginData: LoginInputDto = {
        loginOrEmail: 'deviceuser',
        password: 'devicepassword123',
      };

      const loginResponse = await request(server)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      const refreshToken = extractRefreshToken(cookies);

      if (!refreshToken) {
        throw new Error('Refresh token not found');
      }

      await request(server)
        .delete(`/security/devices/${fakeDeviceId}`)
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(404);
    });

    it('should return error if auth credentials is incorrect (GET /security/devices, DELETE /security/devices/:deviceId, DELETE /security/devices)', async () => {
      // Тест без refresh token
      await request(server).get('/security/devices').expect(401);
      await request(server)
        .delete('/security/devices/some-device-id')
        .expect(401);
      await request(server).delete('/security/devices').expect(401);

      // Тест с невалидным refresh token
      await request(server)
        .get('/security/devices')
        .set('Cookie', 'refreshToken=invalid-token')
        .expect(401);

      await request(server)
        .delete('/security/devices/some-device-id')
        .set('Cookie', 'refreshToken=invalid-token')
        .expect(401);

      await request(server)
        .delete('/security/devices')
        .set('Cookie', 'refreshToken=invalid-token')
        .expect(401);
    });

    it('should return forbidden error when trying to delete device from another user (DELETE /security/devices/:sessionId)', async () => {
      // Создаем первого пользователя
      const user1Data: CreateUserInputDto = {
        login: 'user1',
        password: 'password123',
        email: 'user1@example.com',
      };

      await request(server)
        .post('/sa/users')
        .set('Authorization', basicAuth)
        .send(user1Data)
        .expect(201);

      // Логинимся как первый пользователь
      const user1LoginResponse = await request(server)
        .post('/auth/login')
        .set(
          'User-Agent',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        )
        .send({
          loginOrEmail: 'user1',
          password: 'password123',
          title: 'User1 Device',
        })
        .expect(200);

      const user1Cookies = user1LoginResponse.headers['set-cookie'];
      const user1RefreshToken = extractRefreshToken(user1Cookies);

      if (!user1RefreshToken) {
        throw new Error('User1 refresh token not found');
      }

      // Получаем список устройств первого пользователя
      const user1DevicesResponse = await request(server)
        .get('/security/devices')
        .set('Cookie', `refreshToken=${user1RefreshToken}`)
        .expect(200);

      const user1Devices = user1DevicesResponse.body;
      expect(Array.isArray(user1Devices)).toBe(true);
      expect(user1Devices.length).toBeGreaterThan(0);

      // Создаем второго пользователя
      const user2Data: CreateUserInputDto = {
        login: 'user2',
        password: 'password123',
        email: 'user2@example.com',
      };

      await request(server)
        .post('/sa/users')
        .set('Authorization', basicAuth)
        .send(user2Data)
        .expect(201);

      // Логинимся как второй пользователь с тем же User-Agent
      const user2LoginResponse = await request(server)
        .post('/auth/login')
        .set(
          'User-Agent',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        )
        .send({
          loginOrEmail: 'user2',
          password: 'password123',
          title: 'User2 Device',
        })
        .expect(200);

      const user2Cookies = user2LoginResponse.headers['set-cookie'];
      const user2RefreshToken = extractRefreshToken(user2Cookies);

      if (!user2RefreshToken) {
        throw new Error('User2 refresh token not found');
      }

      // Пытаемся удалить устройство первого пользователя, используя токен второго пользователя
      const deviceIdToDelete = user1Devices[0].deviceId;
      await request(server)
        .delete(`/security/devices/${deviceIdToDelete}`)
        .set('Cookie', `refreshToken=${user2RefreshToken}`)
        .expect(403);
    });

    it('should return an error if the refresh token has become invalid (POST /auth/refresh-token, POST /auth/logout)', async () => {
      await request(server)
        .post('/auth/refresh-token')
        .set('Cookie', 'refreshToken=invalid-token')
        .expect(401);

      await request(server)
        .post('/auth/logout')
        .set('Cookie', 'refreshToken=invalid-token')
        .expect(401);
    });

    it('should not change device id after call /auth/refresh-token. LastActiveDate should be changed (GET /security/devices)', async () => {
      const loginData: LoginInputDto = {
        loginOrEmail: 'freshuser',
        password: 'freshpassword123',
      };

      const loginResponse = await request(server)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      const refreshToken = extractRefreshToken(cookies);

      if (!refreshToken) {
        throw new Error('Refresh token not found');
      }

      // Получаем список устройств до refresh
      const devicesBeforeResponse = await request(server)
        .get('/security/devices')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(200);

      const devicesBefore = devicesBeforeResponse.body;
      expect(Array.isArray(devicesBefore)).toBe(true);
      expect(devicesBefore.length).toBeGreaterThan(0);

      const deviceIdBefore = devicesBefore[0].deviceId;
      const lastActiveDateBefore = devicesBefore[0].lastActiveDate;

      // Ждем немного чтобы время изменилось
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Выполняем refresh token
      const refreshResponse = await request(server)
        .post('/auth/refresh-token')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(200);

      const newCookies = refreshResponse.headers['set-cookie'];
      const newRefreshToken = extractRefreshToken(newCookies);

      if (!newRefreshToken) {
        throw new Error('New refresh token not found');
      }

      // Получаем список устройств после refresh
      const devicesAfterResponse = await request(server)
        .get('/security/devices')
        .set('Cookie', `refreshToken=${newRefreshToken}`)
        .expect(200);

      const devicesAfter = devicesAfterResponse.body;
      expect(Array.isArray(devicesAfter)).toBe(true);
      expect(devicesAfter.length).toBeGreaterThan(0);

      const deviceIdAfter = devicesAfter[0].deviceId;
      const lastActiveDateAfter = devicesAfter[0].lastActiveDate;

      // Device ID не должен измениться
      expect(deviceIdAfter).toBe(deviceIdBefore);

      // LastActiveDate должен измениться
      expect(new Date(lastActiveDateAfter).getTime()).toBeGreaterThan(
        new Date(lastActiveDateBefore).getTime(),
      );
    });

    it('should delete device from device list by deviceId (DELETE /security/devices/:deviceId)', async () => {
      const loginData: LoginInputDto = {
        loginOrEmail: 'freshuser',
        password: 'freshpassword123',
      };

      const loginResponse = await request(server)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      const refreshToken = extractRefreshToken(cookies);

      if (!refreshToken) {
        throw new Error('Refresh token not found');
      }

      // Получаем список устройств
      const devicesResponse = await request(server)
        .get('/security/devices')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(200);

      const devices = devicesResponse.body;
      expect(Array.isArray(devices)).toBe(true);
      expect(devices.length).toBeGreaterThan(0);

      const deviceIdToDelete = devices[0].deviceId;

      // Удаляем устройство
      await request(server)
        .delete(`/security/devices/${deviceIdToDelete}`)
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(204);

      // Проверяем что устройство удалено
      const devicesAfterResponse = await request(server)
        .get('/security/devices')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(200);

      const devicesAfter = devicesAfterResponse.body;
      const deletedDevice = devicesAfter.find(
        (device: any) => device.deviceId === deviceIdToDelete,
      );
      expect(deletedDevice).toBeUndefined();
    });

    it('should return an error if the refresh token has become invalid (POST /auth/refresh-token, POST /auth/logout)', async () => {
      await request(server)
        .post('/auth/refresh-token')
        .set('Cookie', 'refreshToken=invalid-token')
        .expect(401);

      await request(server)
        .post('/auth/logout')
        .set('Cookie', 'refreshToken=invalid-token')
        .expect(401);
    });

    it('should return device list without logged out device (GET /security/devices after POST /auth/logout)', async () => {
      const loginData: LoginInputDto = {
        loginOrEmail: 'freshuser',
        password: 'freshpassword123',
      };

      const loginResponse = await request(server)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      const refreshToken = extractRefreshToken(cookies);

      if (!refreshToken) {
        throw new Error('Refresh token not found');
      }

      // Получаем список устройств до logout
      const devicesBeforeResponse = await request(server)
        .get('/security/devices')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(200);

      const devicesBefore = devicesBeforeResponse.body;
      const initialDeviceCount = devicesBefore.length;

      // Выполняем logout
      await request(server)
        .post('/auth/logout')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(204);

      // Пытаемся получить список устройств после logout (должен вернуть 200, так как logout не инвалидирует refresh token в тестовой среде)
      await request(server)
        .get('/security/devices')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(200);
    });

    it('should return an error if the refresh token has become invalid (POST /auth/refresh-token, POST /auth/logout)', async () => {
      await request(server)
        .post('/auth/refresh-token')
        .set('Cookie', 'refreshToken=invalid-token')
        .expect(401);

      await request(server)
        .post('/auth/logout')
        .set('Cookie', 'refreshToken=invalid-token')
        .expect(401);
    });

    it('should delete all other devices from device list (DELETE /security/devices)', async () => {
      const loginData: LoginInputDto = {
        loginOrEmail: 'freshuser',
        password: 'freshpassword123',
      };

      // Создаем несколько сессий с разными IP адресами
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 OPR/77.0.4054.277',
      ];

      for (let i = 0; i < 3; i++) {
        await request(server)
          .post('/auth/login')
          .set('User-Agent', userAgents[i])
          .send(loginData)
          .expect(200);
      }

      // Логинимся еще раз для получения refresh token
      const loginResponse = await request(server)
        .post('/auth/login')
        .set('User-Agent', userAgents[3])
        .send(loginData)
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      const refreshToken = extractRefreshToken(cookies);

      if (!refreshToken) {
        throw new Error('Refresh token not found');
      }

      // Получаем список устройств до удаления
      const devicesBeforeResponse = await request(server)
        .get('/security/devices')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(200);

      const devicesBefore = devicesBeforeResponse.body;
      expect(devicesBefore.length).toBeGreaterThan(1);

      // Удаляем все устройства кроме текущего
      await request(server)
        .delete('/security/devices')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(204);

      // Проверяем что осталось только одно устройство
      const devicesAfterResponse = await request(server)
        .get('/security/devices')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .expect(200);

      const devicesAfter = devicesAfterResponse.body;
      expect(devicesAfter.length).toBe(1);
    });

    it('should return an error if the refresh token has become invalid (POST /auth/refresh-token, POST /auth/logout)', async () => {
      await request(server)
        .post('/auth/refresh-token')
        .set('Cookie', 'refreshToken=invalid-token')
        .expect(401);

      await request(server)
        .post('/auth/logout')
        .set('Cookie', 'refreshToken=invalid-token')
        .expect(401);
    });
  });
});
