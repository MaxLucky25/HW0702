/* eslint-disable */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CreateUserInputDto } from '../src/modules/auth-manage/user-accounts/api/input-dto/users.input-dto';
import { LoginInputDto } from '../src/modules/auth-manage/access-control/api/input-dto/login.input.dto';
import { PasswordRecoveryInputDto } from '../src/modules/auth-manage/access-control/api/input-dto/password-recovery.input.dto';
import { NewPasswordInputDto } from '../src/modules/auth-manage/access-control/api/input-dto/new-password.input.dto';
import { RegistrationConfirmationInputDto } from '../src/modules/auth-manage/access-control/api/input-dto/registration-confirmation.input.dto';
import { RegistrationEmailResendingInputDto } from '../src/modules/auth-manage/access-control/api/input-dto/registration-email-resending.input.dto';
import { MeViewDto } from '../src/modules/auth-manage/user-accounts/api/view-dto/users.view-dto';
import { Server } from 'http';
import { EmailService } from '../src/modules/auth-manage/access-control/application/helping-application/email.service';
import { E2ETestHelper } from './helpers/e2e-test-helper';

// Mock EmailService
const mockEmailService = {
  sendConfirmationEmail: jest.fn().mockResolvedValue(undefined),
  sendRecoveryEmail: jest.fn().mockResolvedValue(undefined),
};

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let createdUserId: string | null = null;
  let accessToken: string | null = null;

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

  it('should register a new user (POST /auth/registration)', async () => {
    const userData: CreateUserInputDto = {
      login: 'testuser',
      password: 'testpassword123',
      email: 'test@example.com',
    };

    const server = app.getHttpServer() as Server;
    await request(server).post('/auth/registration').send(userData).expect(204);

    // Сохраняем данные для последующих тестов
    createdUserId = 'temp'; // Будет установлен после подтверждения
  });

  // Объединенный тест для валидации регистрации
  it('should return 400 for invalid registration data (POST /auth/registration)', async () => {
    const testCases = [
      {
        data: {
          login: '',
          password: 'validpassword123',
          email: 'valid@example.com',
        },
        description: 'empty login',
      },
      {
        data: {
          login: 'ab',
          password: 'validpassword123',
          email: 'valid@example.com',
        },
        description: 'login too short',
      },
      {
        data: {
          login: 'a'.repeat(11),
          password: 'validpassword123',
          email: 'valid@example.com',
        },
        description: 'login too long',
      },
      {
        data: {
          login: 'validuser',
          password: '12345',
          email: 'valid@example.com',
        },
        description: 'password too short',
      },
      {
        data: {
          login: 'validuser',
          password: 'a'.repeat(21),
          email: 'valid@example.com',
        },
        description: 'password too long',
      },
      {
        data: {
          login: 'validuser',
          password: 'validpassword123',
          email: 'invalid-email',
        },
        description: 'invalid email',
      },
    ];

    const server = app.getHttpServer() as Server;

    for (const testCase of testCases) {
      await request(server)
        .post('/auth/registration')
        .send(testCase.data)
        .expect(400);
    }
  });

  it('should handle minimum length fields in registration (POST /auth/registration)', async () => {
    const minLengthData: CreateUserInputDto = {
      login: 'abc', // Минимальная длина 3 символа
      password: '123456', // Минимальная длина 6 символов
      email: 'min@test.com',
    };

    const server = app.getHttpServer() as Server;
    await request(server)
      .post('/auth/registration')
      .send(minLengthData)
      .expect(204);
  });

  it('should handle maximum length fields in registration (POST /auth/registration)', async () => {
    const maxLengthData: CreateUserInputDto = {
      login: 'a'.repeat(10), // Максимальная длина 10 символов
      password: 'a'.repeat(20), // Максимальная длина 20 символов
      email: 'max@test.com',
    };

    const server = app.getHttpServer() as Server;
    await request(server)
      .post('/auth/registration')
      .send(maxLengthData)
      .expect(204);
  });

  // Объединенный тест для валидации логина
  it('should return 401 for invalid login data (POST /auth/login)', async () => {
    const testCases = [
      {
        data: { loginOrEmail: 'ab', password: 'validpassword123' },
        description: 'login too short',
      },
      {
        data: { loginOrEmail: 'a'.repeat(11), password: 'validpassword123' },
        description: 'login too long',
      },
      {
        data: { loginOrEmail: 'validuser', password: '12345' },
        description: 'password too short',
      },
      {
        data: { loginOrEmail: 'validuser', password: 'a'.repeat(21) },
        description: 'password too long',
      },
    ];

    const server = app.getHttpServer() as Server;

    for (const testCase of testCases) {
      await request(server).post('/auth/login').send(testCase.data).expect(401);
    }
  });

  it('should return 400 if email is invalid in password recovery (POST /auth/password-recovery)', async () => {
    const invalidData: PasswordRecoveryInputDto = {
      email: 'invalid-email', // Невалидный email
    };

    const server = app.getHttpServer() as Server;
    await request(server)
      .post('/auth/password-recovery')
      .send(invalidData)
      .expect(400);
  });

  it('should return 400 if email is empty in password recovery (POST /auth/password-recovery)', async () => {
    const invalidData = {
      email: '', // Пустой email
    };

    const server = app.getHttpServer() as Server;
    await request(server)
      .post('/auth/password-recovery')
      .send(invalidData)
      .expect(400);
  });

  it('should handle valid email in password recovery (POST /auth/password-recovery)', async () => {
    const validData: PasswordRecoveryInputDto = {
      email: 'valid@example.com',
    };

    const server = app.getHttpServer() as Server;
    await request(server)
      .post('/auth/password-recovery')
      .send(validData)
      .expect(204);
  });

  it('should return 400 if new password is too short (POST /auth/new-password)', async () => {
    const invalidData: NewPasswordInputDto = {
      newPassword: '12345', // Минимальная длина 6 символов
      recoveryCode: 'validcode123',
    };

    const server = app.getHttpServer() as Server;
    await request(server)
      .post('/auth/new-password')
      .send(invalidData)
      .expect(400);
  });

  it('should return 400 if new password is too long (POST /auth/new-password)', async () => {
    const invalidData: NewPasswordInputDto = {
      newPassword: 'a'.repeat(21), // Максимальная длина 20 символов
      recoveryCode: 'validcode123',
    };

    const server = app.getHttpServer() as Server;
    await request(server)
      .post('/auth/new-password')
      .send(invalidData)
      .expect(400);
  });

  it('should return 400 if recovery code is too short (POST /auth/new-password)', async () => {
    const invalidData: NewPasswordInputDto = {
      newPassword: 'validpassword123',
      recoveryCode: '12345', // Минимальная длина 6 символов
    };

    const server = app.getHttpServer() as Server;
    await request(server)
      .post('/auth/new-password')
      .send(invalidData)
      .expect(400);
  });

  it('should return 400 if recovery code is too long (POST /auth/new-password)', async () => {
    const invalidData: NewPasswordInputDto = {
      newPassword: 'validpassword123',
      recoveryCode: 'a'.repeat(41), // Максимальная длина 40 символов
    };

    const server = app.getHttpServer() as Server;
    await request(server)
      .post('/auth/new-password')
      .send(invalidData)
      .expect(400);
  });

  // Объединенный тест для недействительных recovery кодов
  it('should return 400 for invalid recovery codes (POST /auth/new-password)', async () => {
    const testCases = [
      {
        data: { newPassword: '123456', recoveryCode: '123456' },
        description: 'minimum length fields',
      },
      {
        data: { newPassword: 'a'.repeat(20), recoveryCode: 'a'.repeat(40) },
        description: 'maximum length fields',
      },
    ];

    const server = app.getHttpServer() as Server;

    for (const testCase of testCases) {
      await request(server)
        .post('/auth/new-password')
        .send(testCase.data)
        .expect(400);
    }
  });

  it('should return 400 if confirmation code is too short (POST /auth/registration-confirmation)', async () => {
    const invalidData: RegistrationConfirmationInputDto = {
      code: '12345', // Минимальная длина 6 символов
    };

    const server = app.getHttpServer() as Server;
    await request(server)
      .post('/auth/registration-confirmation')
      .send(invalidData)
      .expect(400);
  });

  it('should return 400 if confirmation code is too long (POST /auth/registration-confirmation)', async () => {
    const invalidData: RegistrationConfirmationInputDto = {
      code: 'a'.repeat(41), // Максимальная длина 40 символов
    };

    const server = app.getHttpServer() as Server;
    await request(server)
      .post('/auth/registration-confirmation')
      .send(invalidData)
      .expect(400);
  });

  // Объединенный тест для недействительных confirmation кодов
  it('should return 400 for invalid confirmation codes (POST /auth/registration-confirmation)', async () => {
    const testCases = [
      {
        data: { code: '123456' },
        description: 'minimum length code',
      },
      {
        data: { code: 'a'.repeat(40) },
        description: 'maximum length code',
      },
    ];

    const server = app.getHttpServer() as Server;

    for (const testCase of testCases) {
      await request(server)
        .post('/auth/registration-confirmation')
        .send(testCase.data)
        .expect(400);
    }
  });

  it('should return 400 if email is invalid in registration email resending (POST /auth/registration-email-resending)', async () => {
    const invalidData: RegistrationEmailResendingInputDto = {
      email: 'invalid-email', // Невалидный email
    };

    const server = app.getHttpServer() as Server;
    await request(server)
      .post('/auth/registration-email-resending')
      .send(invalidData)
      .expect(400);
  });

  it('should return 400 if email is empty in registration email resending (POST /auth/registration-email-resending)', async () => {
    const invalidData = {
      email: '', // Пустой email
    };

    const server = app.getHttpServer() as Server;
    await request(server)
      .post('/auth/registration-email-resending')
      .send(invalidData)
      .expect(400);
  });

  it('should return 204 for valid email in registration email resending (POST /auth/registration-email-resending)', async () => {
    const validData: RegistrationEmailResendingInputDto = {
      email: 'test@example.com', // Используем email который был зарегистрирован в первом тесте
    };

    const server = app.getHttpServer() as Server;
    await request(server)
      .post('/auth/registration-email-resending')
      .send(validData)
      .expect(204);
  });

  it('should return 401 if trying to access /auth/me without token (GET /auth/me)', async () => {
    const server = app.getHttpServer() as Server;
    await request(server).get('/auth/me').expect(401);
  });

  it('should return 401 if trying to access /auth/me with invalid token (GET /auth/me)', async () => {
    const server = app.getHttpServer() as Server;
    await request(server)
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  // Тест на создание пользователя через User API и последующий логин
  it('should create user via User API and then login (POST /users + POST /auth/login)', async () => {
    // Создаем пользователя через User API
    const userData: CreateUserInputDto = {
      login: 'loginuser',
      password: 'loginpassword123',
      email: 'login@example.com',
    };

    const server = app.getHttpServer() as Server;
    const userResponse = await request(server)
      .post('/sa/users')
      .set('Authorization', basicAuth)
      .send(userData)
      .expect(201);

    const userResponseBody = userResponse.body;
    createdUserId = userResponseBody.id;

    // Теперь пытаемся залогиниться
    const loginData: LoginInputDto = {
      loginOrEmail: userData.login,
      password: userData.password,
    };

    const loginResponse = await request(server)
      .post('/auth/login')
      .send(loginData)
      .expect(200);

    const loginResponseBody = loginResponse.body;
    expect(loginResponseBody).toHaveProperty('accessToken');
    expect(typeof loginResponseBody.accessToken).toBe('string');
    expect(loginResponseBody.accessToken.length).toBeGreaterThan(0);

    accessToken = loginResponseBody.accessToken;
  });

  it('should get current user info with valid token (GET /auth/me)', async () => {
    if (!accessToken) {
      throw new Error('Access token is not set');
    }

    const server = app.getHttpServer() as Server;
    const response = await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const responseBody = response.body as MeViewDto;
    expect(responseBody).toHaveProperty('login');
    expect(responseBody).toHaveProperty('email');
    expect(responseBody).toHaveProperty('userId');
    expect(responseBody.login).toBe('loginuser');
    expect(responseBody.email).toBe('login@example.com');
  });

  it('should return 401 if login credentials are invalid (POST /auth/login)', async () => {
    const invalidLoginData: LoginInputDto = {
      loginOrEmail: 'nonexistentuser',
      password: 'wrongpassword',
    };

    const server = app.getHttpServer() as Server;
    await request(server)
      .post('/auth/login')
      .send(invalidLoginData)
      .expect(401);
  });

  it('should return 401 if password is wrong (POST /auth/login)', async () => {
    const wrongPasswordData: LoginInputDto = {
      loginOrEmail: 'loginuser',
      password: 'wrongpassword',
    };

    const server = app.getHttpServer() as Server;
    await request(server)
      .post('/auth/login')
      .send(wrongPasswordData)
      .expect(401);
  });

  // Тест на повторную регистрацию с тем же email
  it('should return 400 for duplicate email registration (POST /auth/registration)', async () => {
    const duplicateUserData: CreateUserInputDto = {
      login: 'anotheruser',
      password: 'anotherpassword123',
      email: 'login@example.com', // Тот же email
    };

    const server = app.getHttpServer() as Server;
    await request(server)
      .post('/auth/registration')
      .send(duplicateUserData)
      .expect(400); // Ожидаем 400, так как email уже существует
  });

  // Тест на повторную регистрацию с тем же логином
  it('should return 400 for duplicate login registration (POST /auth/registration)', async () => {
    const duplicateUserData: CreateUserInputDto = {
      login: 'loginuser', // Тот же логин
      password: 'anotherpassword123',
      email: 'another@example.com',
    };

    const server = app.getHttpServer() as Server;
    await request(server)
      .post('/auth/registration')
      .send(duplicateUserData)
      .expect(400); // Ожидаем 400, так как логин уже существует
  });
});
