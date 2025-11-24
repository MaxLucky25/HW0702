/* eslint-disable */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CreateUserInputDto } from '../src/modules/auth-manage/user-accounts/api/input-dto/users.input-dto';
import { UserViewDto } from '../src/modules/auth-manage/user-accounts/api/view-dto/users.view-dto';
import { UpdateUserInputDto } from '../src/modules/auth-manage/user-accounts/api/input-dto/update-user.input.dto';
import { PaginatedViewDto } from '../src/core/dto/base.paginated.view-dto';
import { Server } from 'http';
import { E2ETestHelper } from './helpers/e2e-test-helper';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let createdUserId: string | null = null;

  const basicAuth = 'Basic ' + Buffer.from('admin:qwerty').toString('base64');

  beforeAll(async () => {
    const testSetup = await E2ETestHelper.createTestingApp();
    app = testSetup.app;
    server = testSetup.server;
  });

  afterAll(async () => {
    await E2ETestHelper.cleanup(app, server);
  });

  it('should create a user (POST)', async () => {
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

    const responseBody = response.body as UserViewDto;

    expect(responseBody).toEqual({
      id: expect.any(String) as string,
      login: userData.login,
      email: userData.email,
      createdAt: expect.any(String) as string,
    });

    createdUserId = responseBody.id;
  });

  it('should get user by ID (GET)', async () => {
    if (!createdUserId) {
      throw new Error('User ID is not set');
    }

    const response = await request(server)
      .get(`/sa/users/${createdUserId}`)
      .set('Authorization', basicAuth)
      .expect(200);

    const responseBody = response.body as UserViewDto;
    expect(responseBody.id).toBe(createdUserId);
    expect(responseBody.login).toBe('testuser');
    expect(responseBody.email).toBe('test@example.com');
  });

  it('should get all users (GET)', async () => {
    const response = await request(server)
      .get('/sa/users')
      .set('Authorization', basicAuth)
      .query({
        pageNumber: 1,
        pageSize: 10,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      })
      .expect(200);

    const responseBody = response.body as PaginatedViewDto<UserViewDto[]>;
    expect(responseBody).toHaveProperty('items');
    expect(responseBody).toHaveProperty('totalCount');
    expect(responseBody).toHaveProperty('page');
    expect(responseBody).toHaveProperty('pageSize');
    expect(Array.isArray(responseBody.items)).toBe(true);
    expect(responseBody.totalCount).toBeGreaterThan(0);
  });

  it('should update user (PUT)', async () => {
    if (!createdUserId) {
      throw new Error('User ID is not set');
    }

    const updatedData: UpdateUserInputDto = {
      login: 'testuser',
      email: 'updated@example.com',
    };

    await request(server)
      .put(`/sa/users/${createdUserId}`)
      .set('Authorization', basicAuth)
      .send(updatedData)
      .expect(204);

    // Проверяем, что данные обновились
    const response = await request(server)
      .get(`/sa/users/${createdUserId}`)
      .set('Authorization', basicAuth)
      .expect(200);

    const responseBody = response.body as UserViewDto;
    expect(responseBody.email).toBe(updatedData.email);
  });

  it('should delete user (DELETE)', async () => {
    if (!createdUserId) {
      throw new Error('User ID is not set');
    }

    await request(server)
      .delete(`/sa/users/${createdUserId}`)
      .set('Authorization', basicAuth)
      .expect(204);

    // Проверяем, что пользователь удалён
    await request(server)
      .get(`/sa/users/${createdUserId}`)
      .set('Authorization', basicAuth)
      .expect(404);
  });

  // Объединенный тест для валидации CreateUserInputDto
  it('should return 400 for invalid user data (POST)', async () => {
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
        data: { login: 'validuser', password: '', email: 'valid@example.com' },
        description: 'empty password',
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
        data: { login: 'validuser', password: 'validpassword123', email: '' },
        description: 'empty email',
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

    for (const testCase of testCases) {
      await request(server)
        .post('/sa/users')
        .set('Authorization', basicAuth)
        .send(testCase.data)
        .expect(400);
    }
  });

  // Объединенный тест для валидации UpdateUserInputDto
  it('should return 400 for invalid update data (PUT)', async () => {
    if (!createdUserId) {
      throw new Error('User ID is not set');
    }

    const testCases = [
      {
        data: { email: '' },
        description: 'empty email',
      },
      {
        data: { email: 'invalid-email' },
        description: 'invalid email',
      },
    ];

    for (const testCase of testCases) {
      await request(server)
        .put(`/sa/users/${createdUserId}`)
        .set('Authorization', basicAuth)
        .send(testCase.data)
        .expect(400);
    }
  });

  // Объединенный тест для несуществующих ресурсов
  it('should return 404 for non-existent user', async () => {
    const fakeId = '550e8400-e29b-41d4-a716-446655440000'; // Несуществующий UUID

    // GET
    await request(server)
      .get(`/sa/users/${fakeId}`)
      .set('Authorization', basicAuth)
      .expect(404);

    // PUT
    const updateData: UpdateUserInputDto = {
      login: 'testuser',
      email: 'updated@example.com',
    };
    await request(server)
      .put(`/sa/users/${fakeId}`)
      .set('Authorization', basicAuth)
      .send(updateData)
      .expect(404);

    // DELETE
    await request(server)
      .delete(`/sa/users/${fakeId}`)
      .set('Authorization', basicAuth)
      .expect(404);
  });

  // Тесты для граничных значений
  it('should handle minimum length fields (POST)', async () => {
    const minLengthData: CreateUserInputDto = {
      login: 'abc', // Минимальная длина 3 символа
      password: '123456', // Минимальная длина 6 символов
      email: 'min@test.com',
    };

    const response = await request(server)
      .post('/sa/users')
      .set('Authorization', basicAuth)
      .send(minLengthData)
      .expect(201);

    const responseBody = response.body as UserViewDto;
    expect(responseBody.login).toBe(minLengthData.login);
    expect(responseBody.email).toBe(minLengthData.email);
  });

  it('should handle maximum length fields (POST)', async () => {
    const maxLengthData: CreateUserInputDto = {
      login: 'a'.repeat(10), // Максимальная длина 10 символов
      password: 'a'.repeat(20), // Максимальная длина 20 символов
      email: 'max@test.com',
    };

    const response = await request(server)
      .post('/sa/users')
      .set('Authorization', basicAuth)
      .send(maxLengthData)
      .expect(201);

    const responseBody = response.body as UserViewDto;
    expect(responseBody.login).toBe(maxLengthData.login);
    expect(responseBody.email).toBe(maxLengthData.email);
  });

  // Тесты для пагинации и сортировки
  it('should handle pagination parameters (GET)', async () => {
    const response = await request(server)
      .get('/sa/users')
      .set('Authorization', basicAuth)
      .query({
        pageNumber: 2,
        pageSize: 5,
        sortBy: 'login',
        sortDirection: 'asc',
      })
      .expect(200);

    const responseBody = response.body as PaginatedViewDto<UserViewDto[]>;
    expect(responseBody.page).toBe(2);
    expect(responseBody.pageSize).toBe(5);
  });

  it('should handle search by login (GET)', async () => {
    const response = await request(server)
      .get('/sa/users')
      .set('Authorization', basicAuth)
      .query({
        searchLoginTerm: 'test',
        pageNumber: 1,
        pageSize: 10,
      })
      .expect(200);

    const responseBody = response.body as PaginatedViewDto<UserViewDto[]>;
    expect(responseBody.items).toBeDefined();
    expect(Array.isArray(responseBody.items)).toBe(true);
  });

  it('should handle search by email (GET)', async () => {
    const response = await request(server)
      .get('/sa/users')
      .set('Authorization', basicAuth)
      .query({
        searchEmailTerm: 'example',
        pageNumber: 1,
        pageSize: 10,
      })
      .expect(200);

    const responseBody = response.body as PaginatedViewDto<UserViewDto[]>;
    expect(responseBody.items).toBeDefined();
    expect(Array.isArray(responseBody.items)).toBe(true);
  });

  // Объединенный тест для сортировки
  it('should handle different sort parameters (GET)', async () => {
    const sortTestCases = [
      {
        sortBy: 'createdAt',
        sortDirection: 'desc',
        description: 'sort by createdAt desc',
      },
      {
        sortBy: 'login',
        sortDirection: 'asc',
        description: 'sort by login asc',
      },
      {
        sortBy: 'email',
        sortDirection: 'desc',
        description: 'sort by email desc',
      },
    ];

    for (const testCase of sortTestCases) {
      const response = await request(server)
        .get('/sa/users')
        .set('Authorization', basicAuth)
        .query({
          sortBy: testCase.sortBy,
          sortDirection: testCase.sortDirection,
          pageNumber: 1,
          pageSize: 10,
        })
        .expect(200);

      const responseBody = response.body as PaginatedViewDto<UserViewDto[]>;
      expect(responseBody.items).toBeDefined();
      expect(Array.isArray(responseBody.items)).toBe(true);
    }
  });

  // Тест на создание нескольких пользователей
  it('should create multiple users and handle pagination (POST + GET)', async () => {
    const usersData: CreateUserInputDto[] = [
      {
        login: 'user1',
        password: 'password123',
        email: 'user1@example.com',
      },
      {
        login: 'user2',
        password: 'password456',
        email: 'user2@example.com',
      },
      {
        login: 'user3',
        password: 'password789',
        email: 'user3@example.com',
      },
    ];

    for (const userData of usersData) {
      await request(server)
        .post('/sa/users')
        .set('Authorization', basicAuth)
        .send(userData)
        .expect(201);
    }

    // Проверяем пагинацию
    const response = await request(server)
      .get('/sa/users')
      .set('Authorization', basicAuth)
      .query({
        pageNumber: 1,
        pageSize: 2,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      })
      .expect(200);

    const responseBody = response.body as PaginatedViewDto<UserViewDto[]>;
    expect(responseBody.items).toHaveLength(2);
    expect(responseBody.totalCount).toBeGreaterThanOrEqual(3);
    expect(responseBody.page).toBe(1);
    expect(responseBody.pageSize).toBe(2);
  });
});
