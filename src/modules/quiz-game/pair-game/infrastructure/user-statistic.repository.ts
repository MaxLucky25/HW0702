import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { UserStatistic } from '../domain/entities/user-statistic.entity';

@Injectable()
export class UserStatisticRepository {
  constructor(
    @InjectRepository(UserStatistic)
    private readonly repository: Repository<UserStatistic>,
  ) {}

  /**
   * Получить статистику пользователя по userId
   *
   * @usedIn GetUserStatisticUseCase - получение статистики для API
   */
  async findByUserId(userId: string): Promise<UserStatistic | null> {
    return await this.repository.findOne({
      where: { userId },
    });
  }

  /**
   * Получить статистику пользователя или создать пустую если её нет
   * Используется для API когда нужно всегда вернуть статистику
   *
   * @usedIn GetUserStatisticUseCase - получение статистики для API ответа
   */
  async getOrCreateEmptyStatistic(userId: string): Promise<UserStatistic> {
    const statistic = await this.findByUserId(userId);

    if (!statistic) {
      // Создаем временный объект с дефолтными значениями (НЕ сохраняем в БД)
      return UserStatistic.create(userId);
    }

    return statistic;
  }

  /**
   * Обновить статистику после завершения игры
   * Использует upsert логику - создает новую статистику если её нет
   *
   * @usedIn AnswerSubmissionService.checkAndFinishGame - обновление статистики после игры
   */
  async updateStatisticAfterGame(
    userId: string,
    playerScore: number,
    opponentScore: number,
    manager: EntityManager,
  ): Promise<void> {
    // Ищем существующую статистику в рамках транзакции
    let statistic = await manager.findOne(UserStatistic, {
      where: { userId },
    });

    // Если статистики нет - создаем новую
    if (!statistic) {
      statistic = UserStatistic.create(userId);
    }

    // Обновляем статистику с результатами игры
    statistic.updateAfterGame(playerScore, opponentScore);

    // Сохраняем в рамках транзакции
    await manager.save(UserStatistic, statistic);
  }
}
