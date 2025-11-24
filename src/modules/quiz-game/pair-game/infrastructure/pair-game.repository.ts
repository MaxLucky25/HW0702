import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { PairGame } from '../domain/entities/pair-game.entity';
import { GameStatus } from '../domain/dto/game-status.enum';
import { FindActiveGameByUserIdDto } from './dto/pair-game-repo.dto';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

@Injectable()
export class PairGameRepository {
  constructor(
    @InjectRepository(PairGame)
    private readonly repository: Repository<PairGame>,
  ) {}

  // ==================== QUERY METHODS (для чтения) ====================

  /**
   * Получить текущую игру пользователя со всеми связями для чтения
   * Используется для получения полных данных игры после изменения состояния
   *
   * @usedIn ConnectToGameUseCase - загрузка полных данных игры после подключения
   */
  async getCurrentGameByUserIdWithRelations(
    dto: FindActiveGameByUserIdDto,
  ): Promise<PairGame | null> {
    return await this.repository
      .createQueryBuilder('game')
      .innerJoin('game.players', 'player')
      .leftJoinAndSelect('game.players', 'players')
      .leftJoinAndSelect('players.user', 'user')
      .leftJoinAndSelect('game.questions', 'questions')
      .leftJoinAndSelect('questions.question', 'question')
      .leftJoinAndSelect('players.answers', 'answers')
      .leftJoinAndSelect('answers.gameQuestion', 'answerGameQuestion')
      .where('player.userId = :userId', { userId: dto.userId })
      .andWhere('game.status IN (:...statuses)', {
        statuses: [GameStatus.PENDING_SECOND_PLAYER, GameStatus.ACTIVE],
      })
      .orderBy('questions.order', 'ASC')
      .getOne();
  }

  // ==================== COMMAND METHODS (для изменения состояния) ====================

  /**
   * Завершить игру (меняет статус на FINISHED и устанавливает finishGameDate)
   *
   * @usedIn AnswerSubmissionService - завершение игры когда оба игрока ответили на все вопросы
   */
  async finishGame(game: PairGame, manager: EntityManager): Promise<void> {
    game.finishGame();
    await manager.save(PairGame, game);
  }

  // ==================== MATCHMAKING METHODS ====================

  /**
   * Проверяет, что пользователь не участвует в активной игре
   * Выбрасывает исключение, если пользователь уже в игре
   *
   * @usedIn MatchmakingService.connectUserToGame - проверка перед подключением к игре
   */
  async checkUserNotInActiveGame(
    dto: FindActiveGameByUserIdDto,
    manager: EntityManager,
  ): Promise<void> {
    const activeGame = await manager
      .createQueryBuilder(PairGame, 'game')
      .innerJoin('game.players', 'player')
      .where('player.userId = :userId', { userId: dto.userId })
      .andWhere('game.status IN (:...statuses)', {
        statuses: [GameStatus.PENDING_SECOND_PLAYER, GameStatus.ACTIVE],
      })
      .getOne();

    if (activeGame) {
      throw new DomainException({
        code: DomainExceptionCode.Forbidden,
        message: 'Current user is already participating in active pair',
        field: 'Game',
      });
    }
  }

  /**
   * Находит ожидающую игру для подключения пользователя
   * Использует блокировку для предотвращения race conditions
   *
   * @usedIn MatchmakingService.connectUserToGame - поиск игры для подключения второго игрока
   */
  async findWaitingGameForUser(
    dto: FindActiveGameByUserIdDto,
    manager: EntityManager,
  ): Promise<PairGame | null> {
    return await manager
      .createQueryBuilder(PairGame, 'game')
      .where('game.status = :status', {
        status: GameStatus.PENDING_SECOND_PLAYER,
      })
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM players p 
          WHERE p.game_id = game.id AND p.user_id = :userId
        )`,
        { userId: dto.userId },
      )
      .orderBy('game.createdAt', 'ASC')
      .setLock('pessimistic_write_or_fail')
      .getOne();
  }

  /**
   * Сохраняет новую игру в БД
   *
   * @usedIn MatchmakingService.createNewGame - создание новой игры для первого игрока
   */
  async saveNewGame(manager: EntityManager): Promise<PairGame> {
    const game = PairGame.create();
    return await manager.save(PairGame, game);
  }

  /**
   * Начинает игру (меняет статус на ACTIVE и устанавливает startGameDate)
   *
   * @usedIn MatchmakingService.joinGameToWaitingPlayer - начало игры когда подключился второй игрок
   */
  async startGame(game: PairGame, manager: EntityManager): Promise<void> {
    game.startGame();
    await manager.save(PairGame, game);
  }
}
