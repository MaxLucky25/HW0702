/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { BasicAuthGuard } from './basic-auth.guard';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

describe('BasicAuthGuard', () => {
  let guard: BasicAuthGuard;
  let mockConfigService: any;
  let mockExecutionContext: any;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn(),
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BasicAuthGuard,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    guard = module.get<BasicAuthGuard>(BasicAuthGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true for valid credentials', () => {
      // Arrange
      const validUsername = 'admin';
      const validPassword = 'qwerty';
      const authHeader = `Basic ${Buffer.from(`${validUsername}:${validPassword}`).toString('base64')}`;

      const mockRequest = {
        headers: {
          authorization: authHeader,
        },
      };

      mockExecutionContext
        .switchToHttp()
        .getRequest.mockReturnValue(mockRequest);
      mockConfigService.get
        .mockReturnValueOnce(validUsername) // ADMIN_LOGIN
        .mockReturnValueOnce(validPassword); // ADMIN_PASSWORD

      // Act
      const result = guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(mockConfigService.get).toHaveBeenCalledWith('ADMIN_LOGIN');
      expect(mockConfigService.get).toHaveBeenCalledWith('ADMIN_PASSWORD');
    });

    it('should throw DomainException when authorization header is missing', () => {
      // Arrange
      const mockRequest = {
        headers: {},
      };

      mockExecutionContext
        .switchToHttp()
        .getRequest.mockReturnValue(mockRequest);

      // Act & Assert
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        DomainException,
      );
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        'Missing or invalid Authorization header',
      );
    });

    it('should throw DomainException when authorization header is invalid format', () => {
      // Arrange
      const mockRequest = {
        headers: {
          authorization: 'InvalidFormat',
        },
      };

      mockExecutionContext
        .switchToHttp()
        .getRequest.mockReturnValue(mockRequest);

      // Act & Assert
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        DomainException,
      );
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        'Missing or invalid Authorization header',
      );
    });

    it('should throw DomainException when authorization header starts with wrong prefix', () => {
      // Arrange
      const mockRequest = {
        headers: {
          authorization: 'Bearer token123',
        },
      };

      mockExecutionContext
        .switchToHttp()
        .getRequest.mockReturnValue(mockRequest);

      // Act & Assert
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        DomainException,
      );
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        'Missing or invalid Authorization header',
      );
    });

    it('should throw DomainException when username is invalid', () => {
      // Arrange
      const invalidUsername = 'wronguser';
      const validPassword = 'qwerty';
      const authHeader = `Basic ${Buffer.from(`${invalidUsername}:${validPassword}`).toString('base64')}`;

      const mockRequest = {
        headers: {
          authorization: authHeader,
        },
      };

      mockExecutionContext
        .switchToHttp()
        .getRequest.mockReturnValue(mockRequest);
      mockConfigService.get
        .mockReturnValueOnce('admin') // ADMIN_LOGIN
        .mockReturnValueOnce(validPassword); // ADMIN_PASSWORD

      // Act & Assert
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        DomainException,
      );
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        'Invalid credentials',
      );
    });

    it('should throw DomainException when password is invalid', () => {
      // Arrange
      const validUsername = 'admin';
      const invalidPassword = 'wrongpassword';
      const authHeader = `Basic ${Buffer.from(`${validUsername}:${invalidPassword}`).toString('base64')}`;

      const mockRequest = {
        headers: {
          authorization: authHeader,
        },
      };

      mockExecutionContext
        .switchToHttp()
        .getRequest.mockReturnValue(mockRequest);
      mockConfigService.get
        .mockReturnValueOnce(validUsername) // ADMIN_LOGIN
        .mockReturnValueOnce('qwerty'); // ADMIN_PASSWORD

      // Act & Assert
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        DomainException,
      );
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        'Invalid credentials',
      );
    });

    it('should throw DomainException when both username and password are invalid', () => {
      // Arrange
      const invalidUsername = 'wronguser';
      const invalidPassword = 'wrongpassword';
      const authHeader = `Basic ${Buffer.from(`${invalidUsername}:${invalidPassword}`).toString('base64')}`;

      const mockRequest = {
        headers: {
          authorization: authHeader,
        },
      };

      mockExecutionContext
        .switchToHttp()
        .getRequest.mockReturnValue(mockRequest);
      mockConfigService.get
        .mockReturnValueOnce('admin') // ADMIN_LOGIN
        .mockReturnValueOnce('qwerty'); // ADMIN_PASSWORD

      // Act & Assert
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        DomainException,
      );
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        'Invalid credentials',
      );
    });

    it('should handle empty username in credentials', () => {
      // Arrange
      const emptyUsername = '';
      const validPassword = 'qwerty';
      const authHeader = `Basic ${Buffer.from(`${emptyUsername}:${validPassword}`).toString('base64')}`;

      const mockRequest = {
        headers: {
          authorization: authHeader,
        },
      };

      mockExecutionContext
        .switchToHttp()
        .getRequest.mockReturnValue(mockRequest);
      mockConfigService.get
        .mockReturnValueOnce('admin') // ADMIN_LOGIN
        .mockReturnValueOnce(validPassword); // ADMIN_PASSWORD

      // Act & Assert
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        DomainException,
      );
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        'Invalid credentials',
      );
    });

    it('should handle empty password in credentials', () => {
      // Arrange
      const validUsername = 'admin';
      const emptyPassword = '';
      const authHeader = `Basic ${Buffer.from(`${validUsername}:${emptyPassword}`).toString('base64')}`;

      const mockRequest = {
        headers: {
          authorization: authHeader,
        },
      };

      mockExecutionContext
        .switchToHttp()
        .getRequest.mockReturnValue(mockRequest);
      mockConfigService.get
        .mockReturnValueOnce(validUsername) // ADMIN_LOGIN
        .mockReturnValueOnce('qwerty'); // ADMIN_PASSWORD

      // Act & Assert
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        DomainException,
      );
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        'Invalid credentials',
      );
    });

    it('should handle malformed base64 credentials', () => {
      // Arrange
      const mockRequest = {
        headers: {
          authorization: 'Basic invalid-base64-string',
        },
      };

      mockExecutionContext
        .switchToHttp()
        .getRequest.mockReturnValue(mockRequest);

      // Act & Assert
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        DomainException,
      );
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        'Invalid credentials',
      );
    });

    it('should handle credentials without colon separator', () => {
      // Arrange
      const credentials = 'adminqwerty'; // Missing colon
      const authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;

      const mockRequest = {
        headers: {
          authorization: authHeader,
        },
      };

      mockExecutionContext
        .switchToHttp()
        .getRequest.mockReturnValue(mockRequest);
      mockConfigService.get
        .mockReturnValueOnce('admin') // ADMIN_LOGIN
        .mockReturnValueOnce('qwerty'); // ADMIN_PASSWORD

      // Act & Assert
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        DomainException,
      );
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        'Invalid credentials',
      );
    });
  });

  describe('exception details', () => {
    it('should throw DomainException with correct code for missing header', () => {
      // Arrange
      const mockRequest = {
        headers: {},
      };

      mockExecutionContext
        .switchToHttp()
        .getRequest.mockReturnValue(mockRequest);

      // Act & Assert
      try {
        guard.canActivate(mockExecutionContext);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect(error.code).toBe(DomainExceptionCode.Unauthorized);
        expect(error.message).toBe('Missing or invalid Authorization header');
        expect(error.field).toBe('Headers');
      }
    });

    it('should throw DomainException with correct code for invalid credentials', () => {
      // Arrange
      const authHeader = `Basic ${Buffer.from('wronguser:wrongpass').toString('base64')}`;

      const mockRequest = {
        headers: {
          authorization: authHeader,
        },
      };

      mockExecutionContext
        .switchToHttp()
        .getRequest.mockReturnValue(mockRequest);
      mockConfigService.get
        .mockReturnValueOnce('admin') // ADMIN_LOGIN
        .mockReturnValueOnce('qwerty'); // ADMIN_PASSWORD

      // Act & Assert
      try {
        guard.canActivate(mockExecutionContext);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect(error.code).toBe(DomainExceptionCode.Unauthorized);
        expect(error.message).toBe('Invalid credentials');
        expect(error.field).toBe('Login or Password');
      }
    });
  });
});
