/* eslint-disable */
import 'reflect-metadata';
import { validateEnvironment } from './env.validation';
import { DomainException } from '../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../core/exceptions/domain-exception-codes';

describe('Environment Validation', () => {
  it('should validate correct environment variables', () => {
    const validConfig = {
      DATABASE_URL: 'postgresql://localhost:5432/test',
      JWT_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'refresh-secret',
      EMAIL_USER: 'test@example.com',
      EMAIL_PASS: 'password123',
      ADMIN_LOGIN: 'admin',
      ADMIN_PASSWORD: 'qwerty',
      PORT: '3004',
      NODE_ENV: 'development',
    };

    const result = validateEnvironment(validConfig);

    expect(result.DATABASE_URL).toBe('postgresql://localhost:5432/test');
    expect(result.JWT_SECRET).toBe('test-secret');
    expect(result.JWT_REFRESH_SECRET).toBe('refresh-secret');
    expect(result.EMAIL_USER).toBe('test@example.com');
    expect(result.EMAIL_PASS).toBe('password123');
    expect(result.ADMIN_LOGIN).toBe('admin');
    expect(result.ADMIN_PASSWORD).toBe('qwerty');
    expect(result.PORT).toBe(3004);
    expect(result.NODE_ENV).toBe('development');
  });

  it('should throw DomainException for missing required variables', () => {
    const invalidConfig = {
      PORT: '3004',
      NODE_ENV: 'development',
      // Missing: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, EMAIL_USER, EMAIL_PASS
    };

    expect(() => validateEnvironment(invalidConfig)).toThrow(DomainException);

    try {
      validateEnvironment(invalidConfig);
    } catch (error) {
      expect(error).toBeInstanceOf(DomainException);
      expect(error.code).toBe(DomainExceptionCode.ValidationError);
      expect(error.message).toBe('Environment variables validation failed');
      expect(error.field).toBe('environment');
      expect(error.extensions).toHaveLength(7); // DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, EMAIL_USER, EMAIL_PASS, ADMIN_LOGIN, ADMIN_PASSWORD

      // Check that extensions contain the right fields
      const fieldNames = error.extensions.map((ext) => ext.key);
      expect(fieldNames).toContain('DATABASE_URL');
      expect(fieldNames).toContain('JWT_SECRET');
      expect(fieldNames).toContain('JWT_REFRESH_SECRET');
      expect(fieldNames).toContain('EMAIL_USER');
      expect(fieldNames).toContain('EMAIL_PASS');
      expect(fieldNames).toContain('ADMIN_LOGIN');
      expect(fieldNames).toContain('ADMIN_PASSWORD');
    }
  });

  it('should throw DomainException for invalid URL format', () => {
    const invalidConfig = {
      DATABASE_URL: 'invalid-url',
      JWT_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'refresh-secret',
      EMAIL_USER: 'test@example.com',
      EMAIL_PASS: 'password123',
      ADMIN_LOGIN: 'admin',
      ADMIN_PASSWORD: 'qwerty',
    };

    expect(() => validateEnvironment(invalidConfig)).toThrow(DomainException);

    try {
      validateEnvironment(invalidConfig);
    } catch (error) {
      expect(error).toBeInstanceOf(DomainException);
      expect(error.code).toBe(DomainExceptionCode.ValidationError);
      expect(error.extensions).toHaveLength(1);
      expect(error.extensions[0].key).toBe('DATABASE_URL');
    }
  });

  it('should throw DomainException for invalid PORT number', () => {
    const invalidConfig = {
      DATABASE_URL: 'postgresql://localhost:5432/test',
      JWT_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'refresh-secret',
      EMAIL_USER: 'test@example.com',
      EMAIL_PASS: 'password123',
      ADMIN_LOGIN: 'admin',
      ADMIN_PASSWORD: 'qwerty',
      PORT: '99999', // Invalid port number
    };

    expect(() => validateEnvironment(invalidConfig)).toThrow(DomainException);

    try {
      validateEnvironment(invalidConfig);
    } catch (error) {
      expect(error).toBeInstanceOf(DomainException);
      expect(error.code).toBe(DomainExceptionCode.ValidationError);
      expect(error.extensions).toHaveLength(1);
      expect(error.extensions[0].key).toBe('PORT');
    }
  });

  it('should transform string numbers to actual numbers', () => {
    const config = {
      DATABASE_URL: 'postgresql://localhost:5432/test',
      JWT_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'refresh-secret',
      EMAIL_USER: 'test@example.com',
      EMAIL_PASS: 'password123',
      ADMIN_LOGIN: 'admin',
      ADMIN_PASSWORD: 'qwerty',
      PORT: '3004',
      JWT_EXPIRES_IN: '600',
      THROTTLE_LIMIT: '5',
    };

    const result = validateEnvironment(config);

    expect(typeof result.PORT).toBe('number');
    expect(result.PORT).toBe(3004);
    expect(typeof result.JWT_EXPIRES_IN).toBe('number');
    expect(result.JWT_EXPIRES_IN).toBe(600);
    expect(typeof result.THROTTLE_LIMIT).toBe('number');
    expect(result.THROTTLE_LIMIT).toBe(5);
  });

  it('should handle optional variables correctly', () => {
    const minimalConfig = {
      DATABASE_URL: 'postgresql://localhost:5432/test',
      JWT_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'refresh-secret',
      EMAIL_USER: 'test@example.com',
      EMAIL_PASS: 'password123',
      ADMIN_LOGIN: 'admin',
      ADMIN_PASSWORD: 'qwerty',
    };

    const result = validateEnvironment(minimalConfig);

    expect(result.DATABASE_URL).toBe('postgresql://localhost:5432/test');
    expect(result.JWT_SECRET).toBe('test-secret');
    expect(result.JWT_REFRESH_SECRET).toBe('refresh-secret');
    expect(result.EMAIL_USER).toBe('test@example.com');
    expect(result.EMAIL_PASS).toBe('password123');
    expect(result.ADMIN_LOGIN).toBe('admin');
    expect(result.ADMIN_PASSWORD).toBe('qwerty');
    expect(result.PORT).toBeUndefined();
    expect(result.NODE_ENV).toBeUndefined();
  });
});
