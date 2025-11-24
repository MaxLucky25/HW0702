/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BcryptService } from './bcrypt.service';
import { GenerateHashDto, CompareDto } from './dto/bcrypt.dto';
import bcrypt from 'bcryptjs';

// Mock bcrypt module
jest.mock('bcryptjs');

describe('BcryptService', () => {
  let service: BcryptService;
  let configService: ConfigService;
  let mockBcrypt: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BcryptService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BcryptService>(BcryptService);
    configService = module.get<ConfigService>(ConfigService);
    mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateHash', () => {
    it('should generate hash with correct salt rounds', async () => {
      // Arrange
      const mockSaltRounds = 10;
      const mockSalt = 'mockSalt123';
      const mockHash = 'mockHash123';
      const dto: GenerateHashDto = { password: 'testPassword123' };

      jest.spyOn(configService, 'get').mockReturnValue(mockSaltRounds);
      mockBcrypt.genSalt.mockResolvedValue(mockSalt as never);
      mockBcrypt.hash.mockResolvedValue(mockHash as never);

      // Act
      const result = await service.generateHash(dto);

      // Assert
      expect(configService.get).toHaveBeenCalledWith('BCRYPT_SALT_ROUNDS');
      expect(mockBcrypt.genSalt).toHaveBeenCalledWith(mockSaltRounds);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(dto.password, mockSalt);
      expect(result).toBe(mockHash);
    });

    it('should use default salt rounds if config is not set', async () => {
      // Arrange
      const mockSalt = 'mockSalt123';
      const mockHash = 'mockHash123';
      const dto: GenerateHashDto = { password: 'testPassword123' };

      jest.spyOn(configService, 'get').mockReturnValue(undefined);
      mockBcrypt.genSalt.mockResolvedValue(mockSalt as never);
      mockBcrypt.hash.mockResolvedValue(mockHash as never);

      // Act
      const result = await service.generateHash(dto);

      // Assert
      expect(mockBcrypt.genSalt).toHaveBeenCalledWith(undefined);
      expect(result).toBe(mockHash);
    });

    it('should handle bcrypt errors gracefully', async () => {
      // Arrange
      const dto: GenerateHashDto = { password: 'testPassword123' };
      const mockError = new Error('bcrypt error');

      jest.spyOn(configService, 'get').mockReturnValue(10);
      mockBcrypt.genSalt.mockRejectedValue(mockError as any);

      // Act & Assert
      await expect(service.generateHash(dto)).rejects.toThrow('bcrypt error');
    });
  });

  describe('compare', () => {
    it('should return true for matching password and hash', async () => {
      // Arrange
      const dto: CompareDto = {
        password: 'testPassword123',
        hash: 'mockHash123',
      };

      mockBcrypt.compare.mockResolvedValue(true as never);

      // Act
      const result = await service.compare(dto);

      // Assert
      expect(mockBcrypt.compare).toHaveBeenCalledWith(dto.password, dto.hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password and hash', async () => {
      // Arrange
      const dto: CompareDto = {
        password: 'testPassword123',
        hash: 'mockHash123',
      };

      mockBcrypt.compare.mockResolvedValue(false as never);

      // Act
      const result = await service.compare(dto);

      // Assert
      expect(mockBcrypt.compare).toHaveBeenCalledWith(dto.password, dto.hash);
      expect(result).toBe(false);
    });

    it('should handle bcrypt compare errors gracefully', async () => {
      // Arrange
      const dto: CompareDto = {
        password: 'testPassword123',
        hash: 'mockHash123',
      };
      const mockError = new Error('bcrypt compare error');

      mockBcrypt.compare.mockRejectedValue(mockError as any);

      // Act & Assert
      await expect(service.compare(dto)).rejects.toThrow(
        'bcrypt compare error',
      );
    });
  });
});
