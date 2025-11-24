import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Player } from '../domain/entities/player.entity';
import { PlayerRole } from '../domain/dto/player-role.enum';
import { GameStatus } from '../domain/dto/game-status.enum';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';
import { FindPlayerByUserIdDto } from './dto/player-repo.dto';

@Injectable()
export class PlayerRepository {
  constructor(
    @InjectRepository(Player)
    private readonly repository: Repository<Player>,
  ) {}

  // ==================== ANSWER SUBMISSION METHODS ====================

  /**
   * Найти игрока по userId с игрой, вопросами, игроками и ответами в одном запросе
   * Фильтрует только активные игры (ACTIVE или PENDING_SECOND_PLAYER)
   * Использует Query Builder для фильтрации по статусу игры
   *
   * @usedIn AnswerSubmissionService - объединение всех запросов в один
   */
  async findPlayerWithGameAndAnswers(
    dto: FindPlayerByUserIdDto,
    manager: EntityManager,
  ): Promise<Player | null> {
    return await manager
      .createQueryBuilder(Player, 'player')
      .leftJoinAndSelect('player.game', 'game')
      .leftJoinAndSelect('game.questions', 'questions')
      .leftJoinAndSelect('questions.question', 'question')
      .leftJoinAndSelect('game.players', 'players')
      .leftJoinAndSelect('player.answers', 'answers')
      .where('player.userId = :userId', { userId: dto.userId })
      .andWhere('game.status IN (:...statuses)', {
        statuses: [GameStatus.PENDING_SECOND_PLAYER, GameStatus.ACTIVE],
      })
      .orderBy('questions.order', 'ASC')
      .getOne();
  }

  /**
   * Обновить счет игрока (увеличивает при правильном ответе, завершает при последнем вопросе)
   * Использует update вместо save, чтобы не трогать relations
   *
   * @usedIn AnswerSubmissionService.submitAnswer - обновление счета после отправки ответа
   */
  async updatePlayerScore(
    player: Player,
    isCorrect: boolean,
    isLastQuestion: boolean,
    manager: EntityManager,
  ): Promise<Player> {
    const updateData: Partial<Player> = {};

    if (isCorrect) {
      player.incrementScore();
      updateData.score = player.score;
    }

    if (isLastQuestion) {
      player.finish();
      updateData.finishedAt = player.finishedAt;
    }

    // Используем update вместо save, чтобы не трогать relations
    if (Object.keys(updateData).length > 0) {
      await manager.update(Player, { id: player.id }, updateData);
    }

    // Возвращаем обновленный объект для синхронизации в памяти
    return player;
  }

  /**
   * Сохранить нескольких игроков (используется для обновления бонусов)
   *
   * @usedIn AnswerSubmissionService.checkAndFinishGame - сохранение игроков с начисленными бонусами
   */
  async savePlayers(players: Player[], manager: EntityManager): Promise<void> {
    await manager.save(Player, players);
  }

  // ==================== MATCHMAKING METHODS ====================

  /**
   * Создает и сохраняет первого игрока
   *
   * @usedIn MatchmakingService.createNewGame - создание первого игрока при создании новой игры
   */
  async createFirstPlayer(
    gameId: string,
    userId: string,
    manager: EntityManager,
  ): Promise<void> {
    const firstPlayer = Player.create({
      gameId,
      userId,
      role: PlayerRole.FIRST_PLAYER,
    });
    await manager.save(Player, firstPlayer);
  }

  /**
   * Создает второго игрока с обработкой race condition
   * Если игрок уже существует (из-за параллельных запросов), продолжает выполнение
   *
   * @usedIn MatchmakingService.joinGameToWaitingPlayer - создание второго игрока при подключении к игре
   */
  async createSecondPlayerWithRaceConditionHandling(
    gameId: string,
    userId: string,
    manager: EntityManager,
  ): Promise<void> {
    const secondPlayer = Player.create({
      gameId,
      userId,
      role: PlayerRole.SECOND_PLAYER,
    });

    try {
      await manager.save(Player, secondPlayer);
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        // Игрок уже был создан другим запросом - проверяем его существование
        await this.checkPlayerExists(gameId, userId, manager);
      } else {
        throw error;
      }
    }
  }

  /**
   * Проверяет существование игрока, выбрасывает исключение если не найден
   *
   * @usedIn PlayerRepository.createSecondPlayerWithRaceConditionHandling - внутренний метод для обработки race condition
   */
  async checkPlayerExists(
    gameId: string,
    userId: string,
    manager: EntityManager,
  ): Promise<void> {
    const existingPlayer = await manager.findOne(Player, {
      where: { gameId, userId },
    });

    if (!existingPlayer) {
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'Player creation failed due to race condition',
        field: 'Player',
      });
    }
  }

  /**
   * Проверяет, является ли ошибка ошибкой уникального ограничения PostgreSQL
   *
   * @usedIn PlayerRepository.createSecondPlayerWithRaceConditionHandling - внутренний метод для обработки race condition
   */
  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === '23505'
    );
  }
}
