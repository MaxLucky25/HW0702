/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { DomainHttpExceptionsFilter } from './domain-exceptions.filter';
import { DomainException } from '../domain-exceptions';
import { DomainExceptionCode } from '../domain-exception-codes';
import { Extension } from '../domain-exceptions';

describe('DomainHttpExceptionsFilter', () => {
  let filter: DomainHttpExceptionsFilter;
  let mockResponse: any;
  let mockArgumentsHost: any;

  beforeEach(async () => {
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DomainHttpExceptionsFilter],
    }).compile();

    filter = module.get<DomainHttpExceptionsFilter>(DomainHttpExceptionsFilter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('catch', () => {
    it('should handle DomainException with single error', () => {
      // Arrange
      const domainException = new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: 'Validation failed',
        field: 'email',
      });

      // Act
      filter.catch(domainException, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        errorsMessages: [
          {
            message: 'Validation failed',
            field: 'email',
          },
        ],
      });
    });

    it('should handle DomainException with extensions array', () => {
      // Arrange
      const extensions: Extension[] = [
        new Extension('Email is invalid', 'email'),
        new Extension('Password is too short', 'password'),
      ];

      const domainException = new DomainException({
        code: DomainExceptionCode.ValidationError,
        message: 'Multiple validation errors',
        field: 'validation',
        extensions,
      });

      // Act
      filter.catch(domainException, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        errorsMessages: [
          {
            message: 'Email is invalid',
            field: 'email',
          },
          {
            message: 'Password is too short',
            field: 'password',
          },
        ],
      });
    });

    it('should handle DomainException with empty extensions array', () => {
      // Arrange
      const extensions: Extension[] = [];

      const domainException = new DomainException({
        code: DomainExceptionCode.ValidationError,
        message: 'Validation error with empty extensions',
        field: 'validation',
        extensions,
      });

      // Act
      filter.catch(domainException, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        errorsMessages: [
          {
            message: 'Validation error with empty extensions',
            field: 'validation',
          },
        ],
      });
    });

    it('should handle DomainException with different error codes', () => {
      // Arrange
      const testCases = [
        {
          code: DomainExceptionCode.NotFound,
          expectedStatus: HttpStatus.NOT_FOUND,
        },
        {
          code: DomainExceptionCode.Unauthorized,
          expectedStatus: HttpStatus.UNAUTHORIZED,
        },
        {
          code: DomainExceptionCode.Forbidden,
          expectedStatus: HttpStatus.FORBIDDEN,
        },
        {
          code: DomainExceptionCode.InternalServerError,
          expectedStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        },
        {
          code: DomainExceptionCode.TooManyRequests,
          expectedStatus: HttpStatus.TOO_MANY_REQUESTS,
        },
      ];

      testCases.forEach(({ code, expectedStatus }) => {
        // Reset mocks
        jest.clearAllMocks();

        const domainException = new DomainException({
          code,
          message: `Error with code ${code}`,
          field: 'test',
        });

        // Act
        filter.catch(domainException, mockArgumentsHost);

        // Assert
        expect(mockResponse.status).toHaveBeenCalledWith(expectedStatus);
        expect(mockResponse.json).toHaveBeenCalledWith({
          errorsMessages: [
            {
              message: `Error with code ${code}`,
              field: 'test',
            },
          ],
        });
      });
    });

    it('should handle DomainException with complex extensions', () => {
      // Arrange
      const extensions: Extension[] = [
        new Extension('First error message', 'field1'),
        new Extension('Second error message', 'field2'),
        new Extension('Third error message', 'field3'),
      ];

      const domainException = new DomainException({
        code: DomainExceptionCode.ValidationError,
        message: 'Complex validation errors',
        field: 'complex',
        extensions,
      });

      // Act
      filter.catch(domainException, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        errorsMessages: [
          {
            message: 'First error message',
            field: 'field1',
          },
          {
            message: 'Second error message',
            field: 'field2',
          },
          {
            message: 'Third error message',
            field: 'field3',
          },
        ],
      });
    });

    it('should handle DomainException with empty message', () => {
      // Arrange
      const domainException = new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: '',
        field: 'emptyMessage',
      });

      // Act
      filter.catch(domainException, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        errorsMessages: [
          {
            message: '',
            field: 'emptyMessage',
          },
        ],
      });
    });

    it('should handle DomainException with empty field', () => {
      // Arrange
      const domainException = new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: 'Error message',
        field: '',
      });

      // Act
      filter.catch(domainException, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        errorsMessages: [
          {
            message: 'Error message',
            field: '',
          },
        ],
      });
    });

    it('should handle DomainException with null field', () => {
      // Arrange
      const domainException = new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: 'Error message',
        field: null as any,
      });

      // Act
      filter.catch(domainException, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        errorsMessages: [
          {
            message: 'Error message',
            field: null,
          },
        ],
      });
    });
  });

  describe('response structure', () => {
    it('should always return errorsMessages array', () => {
      // Arrange
      const domainException = new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: 'Test error',
        field: 'test',
      });

      // Act
      filter.catch(domainException, mockArgumentsHost);

      // Assert
      const responseBody = mockResponse.json.mock.calls[0][0];
      expect(responseBody).toHaveProperty('errorsMessages');
      expect(Array.isArray(responseBody.errorsMessages)).toBe(true);
    });

    it('should maintain correct error message structure', () => {
      // Arrange
      const domainException = new DomainException({
        code: DomainExceptionCode.ValidationError,
        message: 'Validation failed',
        field: 'email',
        extensions: [
          new Extension('Email format is invalid', 'email'),
          new Extension('Email is required', 'email'),
        ],
      });

      // Act
      filter.catch(domainException, mockArgumentsHost);

      // Assert
      const responseBody = mockResponse.json.mock.calls[0][0];
      expect(responseBody.errorsMessages).toHaveLength(2);

      responseBody.errorsMessages.forEach((error: any) => {
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('field');
        expect(typeof error.message).toBe('string');
        expect(typeof error.field).toBe('string');
      });
    });
  });
});
