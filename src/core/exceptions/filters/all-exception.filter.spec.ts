/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AllHttpExceptionsFilter } from './all-exception.filter';
import { ConfigService } from '@nestjs/config';
import { ThrottlerException } from '@nestjs/throttler';

describe('AllHttpExceptionsFilter', () => {
  let filter: AllHttpExceptionsFilter;
  let mockConfigService: any;
  let mockResponse: any;
  let mockArgumentsHost: any;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn(),
    };

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
      providers: [
        AllHttpExceptionsFilter,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    filter = module.get<AllHttpExceptionsFilter>(AllHttpExceptionsFilter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('catch', () => {
    it('should handle ThrottlerException with 429 status', () => {
      // Arrange
      const throttlerException = new ThrottlerException();
      mockConfigService.get.mockReturnValue('development');

      // Act
      filter.catch(throttlerException, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.TOO_MANY_REQUESTS,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        errorsMessages: [
          {
            message: 'ThrottlerException: Too Many Requests',
            field: ' We are working to fix this issue. Please try again later.',
          },
        ],
      });
    });

    it('should handle regular Error with 500 status in development', () => {
      // Arrange
      const regularError = new Error('Test error message');
      mockConfigService.get.mockReturnValue('development');

      // Act
      filter.catch(regularError, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        errorsMessages: [
          {
            message: 'Test error message',
            field: ' We are working to fix this issue. Please try again later.',
          },
        ],
      });
    });

    it('should handle regular Error with 500 status in production with hidden message', () => {
      // Arrange
      const regularError = new Error('Test error message');
      mockConfigService.get.mockReturnValue('production');

      // Act
      filter.catch(regularError, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        errorsMessages: [
          {
            message: 'Internal server error',
            field: ' We are working to fix this issue. Please try again later.',
          },
        ],
      });
    });

    it('should handle Error with message property', () => {
      // Arrange
      const errorWithMessage = { message: 'Custom error message' };
      mockConfigService.get.mockReturnValue('development');

      // Act
      filter.catch(errorWithMessage, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        errorsMessages: [
          {
            message: 'Custom error message',
            field: ' We are working to fix this issue. Please try again later.',
          },
        ],
      });
    });

    it('should handle Error without message property', () => {
      // Arrange
      const errorWithoutMessage = { someProperty: 'value' };
      mockConfigService.get.mockReturnValue('development');

      // Act
      filter.catch(errorWithoutMessage, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        errorsMessages: [
          {
            message: 'Unknown exception occurred.',
            field: ' We are working to fix this issue. Please try again later.',
          },
        ],
      });
    });

    it('should handle string error', () => {
      // Arrange
      const stringError = 'String error message';
      mockConfigService.get.mockReturnValue('development');

      // Act
      filter.catch(stringError, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        errorsMessages: [
          {
            message: 'Unknown exception occurred.',
            field: ' We are working to fix this issue. Please try again later.',
          },
        ],
      });
    });

    it('should handle null error', () => {
      // Arrange
      const nullError = null;
      mockConfigService.get.mockReturnValue('development');

      // Act
      filter.catch(nullError, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        errorsMessages: [
          {
            message: 'Unknown exception occurred.',
            field: ' We are working to fix this issue. Please try again later.',
          },
        ],
      });
    });

    it('should handle undefined error', () => {
      // Arrange
      const undefinedError = undefined;
      mockConfigService.get.mockReturnValue('development');

      // Act
      filter.catch(undefinedError, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        errorsMessages: [
          {
            message: 'Unknown exception occurred.',
            field: ' We are working to fix this issue. Please try again later.',
          },
        ],
      });
    });

    it('should handle number error', () => {
      // Arrange
      const numberError = 42;
      mockConfigService.get.mockReturnValue('development');

      // Act
      filter.catch(numberError, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        errorsMessages: [
          {
            message: 'Unknown exception occurred.',
            field: ' We are working to fix this issue. Please try again later.',
          },
        ],
      });
    });
  });

  describe('environment handling', () => {
    it('should show error message in development environment', () => {
      // Arrange
      const error = new Error('Development error');
      mockConfigService.get.mockReturnValue('development');

      // Act
      filter.catch(error, mockArgumentsHost);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith({
        errorsMessages: [
          {
            message: 'Development error',
            field: ' We are working to fix this issue. Please try again later.',
          },
        ],
      });
    });

    it('should hide error message in production environment', () => {
      // Arrange
      const error = new Error('Production error');
      mockConfigService.get.mockReturnValue('production');

      // Act
      filter.catch(error, mockArgumentsHost);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith({
        errorsMessages: [
          {
            message: 'Internal server error',
            field: ' We are working to fix this issue. Please try again later.',
          },
        ],
      });
    });

    it('should show error message in test environment', () => {
      // Arrange
      const error = new Error('Test error');
      mockConfigService.get.mockReturnValue('test');

      // Act
      filter.catch(error, mockArgumentsHost);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith({
        errorsMessages: [
          {
            message: 'Test error',
            field: ' We are working to fix this issue. Please try again later.',
          },
        ],
      });
    });
  });
});
