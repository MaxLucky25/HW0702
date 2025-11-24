import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { CompareDto, GenerateHashDto } from './dto/bcrypt.dto';

@Injectable()
export class BcryptService {
  constructor(private configService: ConfigService) {}
  async generateHash(dto: GenerateHashDto): Promise<string> {
    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS');
    const salt = await bcrypt.genSalt(saltRounds);
    return bcrypt.hash(dto.password, salt);
  }

  async compare(dto: CompareDto): Promise<boolean> {
    return bcrypt.compare(dto.password, dto.hash);
  }
}
