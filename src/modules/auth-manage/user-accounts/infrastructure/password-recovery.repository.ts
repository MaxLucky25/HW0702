import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordRecovery } from '../domain/entities/password-recovery.entity';
import { FindByRecoveryCodeDto } from './dto/password-recovery.dto';

@Injectable()
export class PasswordRecoveryRepository {
  constructor(
    @InjectRepository(PasswordRecovery)
    private readonly repository: Repository<PasswordRecovery>,
  ) {}

  async findByRecoveryCode(
    dto: FindByRecoveryCodeDto,
  ): Promise<PasswordRecovery | null> {
    return await this.repository.findOne({
      where: { recoveryCode: dto.recoveryCode },
    });
  }

  /**
   * Создать или регенерировать recovery код с автогенерацией
   */
  async createOrRegenerate(
    userId: string,
    expirationMinutes: number,
  ): Promise<PasswordRecovery> {
    let passwordRecovery = await this.repository.findOne({
      where: { userId },
    });

    if (!passwordRecovery) {
      // Создаем новую запись
      passwordRecovery = PasswordRecovery.create(userId, expirationMinutes);
    } else {
      // Регенерируем код в существующей записи
      passwordRecovery.regenerateCode(expirationMinutes);
    }

    return await this.repository.save(passwordRecovery);
  }

  async confirmPasswordRecovery(entity: PasswordRecovery): Promise<void> {
    entity.confirm();
    await this.repository.save(entity);
  }
}
