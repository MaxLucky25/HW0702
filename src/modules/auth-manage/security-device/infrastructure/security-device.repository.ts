import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Session } from '../domain/session.entity';
import {
  FindByUserIdDto,
  RevokeAllUserSessionsExceptCurrentDto,
  FindByUserAndDeviceDto,
} from './dto/session-repo.dto';
import { CreateSessionDomainDto } from '../domain/dto/create-session.domain.dto';

@Injectable()
export class SecurityDeviceRepository {
  constructor(
    @InjectRepository(Session)
    private readonly repository: Repository<Session>,
  ) {}

  /**
   * Основной метод для refresh flow - поиск по userId + deviceId
   */
  async findByUserAndDevice(
    dto: FindByUserAndDeviceDto,
  ): Promise<Session | null> {
    return await this.repository.findOne({
      where: {
        userId: dto.userId,
        deviceId: dto.deviceId,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
    });
  }

  /**
   * Метод для поиска сессии только по deviceId (для проверки прав доступа)
   */
  async findByDeviceId(deviceId: string): Promise<Session | null> {
    return await this.repository.findOne({
      where: {
        deviceId,
        isRevoked: false,
      },
    });
  }

  /**
   * Найти все активные сессии пользователя
   */
  async findByUserId(dto: FindByUserIdDto): Promise<Session[]> {
    return await this.repository.find({
      where: {
        userId: dto.userId,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
      order: {
        lastActiveDate: 'DESC',
      },
    });
  }

  /**
   * Создать новую сессию
   */
  async createSession(dto: CreateSessionDomainDto): Promise<Session> {
    const session = Session.createSession(dto);
    return await this.repository.save(session);
  }

  /**
   * Сохранить изменения сессии
   */
  async save(session: Session): Promise<Session> {
    return await this.repository.save(session);
  }

  /**
   * Отозвать сессию (принимает entity напрямую)
   */
  async revokeSession(session: Session): Promise<void> {
    session.revoke();
    await this.repository.save(session);
  }

  /**
   * Отозвать все сессии пользователя кроме текущей
   */
  async revokeAllUserSessionsExceptCurrent(
    dto: RevokeAllUserSessionsExceptCurrentDto,
  ): Promise<void> {
    const sessions = await this.findByUserId({ userId: dto.userId });
    const sessionsToRevoke = sessions.filter(
      (session) => session.deviceId !== dto.currentDeviceId,
    );

    for (const session of sessionsToRevoke) {
      session.revoke();
      await this.repository.save(session);
    }
  }
}
