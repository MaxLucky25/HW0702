import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailConfirmation } from '../domain/entities/email-confirmation.entity';
import { FindByConfirmationCodeDto } from './dto/email-confirmation.dto';

@Injectable()
export class EmailConfirmationRepository {
  constructor(
    @InjectRepository(EmailConfirmation)
    private readonly repository: Repository<EmailConfirmation>,
  ) {}

  async createEmailConfirmation(
    userId: string,
    expirationMinutes: number,
  ): Promise<EmailConfirmation> {
    // Используем статический метод Entity для создания с автогенерацией кода
    const emailConfirmation = EmailConfirmation.create(
      userId,
      expirationMinutes,
    );

    return await this.repository.save(emailConfirmation);
  }

  async findByConfirmationCode(
    dto: FindByConfirmationCodeDto,
  ): Promise<EmailConfirmation | null> {
    return await this.repository.findOne({
      where: { confirmationCode: dto.confirmationCode },
    });
  }

  async findByUserId(userId: string): Promise<EmailConfirmation | null> {
    return await this.repository.findOne({
      where: { userId },
    });
  }

  /**
   * Создать или обновить email confirmation с автогенерацией кода
   */
  async createOrRegenerate(
    userId: string,
    expirationMinutes: number,
  ): Promise<EmailConfirmation> {
    let emailConfirmation = await this.findByUserId(userId);

    if (!emailConfirmation) {
      // Создаем новую запись
      emailConfirmation = EmailConfirmation.create(userId, expirationMinutes);
    } else {
      // Регенерируем код в существующей записи
      emailConfirmation.regenerateCode(expirationMinutes);
    }

    return await this.repository.save(emailConfirmation);
  }

  async confirmEmailConfirmation(entity: EmailConfirmation): Promise<void> {
    entity.confirm();
    await this.repository.save(entity);
  }
}
