import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { PairGame } from '../../domain/entities/pair-game.entity';
import { FindActiveGameByUserIdDto } from '../dto/pair-game-repo.dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { GameStatus } from '../../domain/dto/game-status.enum';

@Injectable()
export class PairGameQueryRepository {
  constructor(
    @InjectRepository(PairGame)
    private readonly repository: Repository<PairGame>,
  ) {}

  /**
   * Применяет загрузку всех необходимых связей для игры
   * Используется в нескольких методах для единообразия и переиспользования
   *
   * @usedIn getCurrentGameByUserId, getGameByIdForUser, getMyGames
   */
  private applyGameRelations(
    queryBuilder: SelectQueryBuilder<PairGame>,
  ): SelectQueryBuilder<PairGame> {
    return queryBuilder
      .leftJoinAndSelect('game.players', 'players')
      .leftJoinAndSelect('players.user', 'user')
      .leftJoinAndSelect('game.questions', 'questions')
      .leftJoinAndSelect('questions.question', 'question')
      .leftJoinAndSelect('players.answers', 'answers')
      .leftJoinAndSelect('answers.gameQuestion', 'answerGameQuestion');
  }

  async getCurrentGameByUserId(
    dto: FindActiveGameByUserIdDto,
  ): Promise<PairGame | null> {
    const queryBuilder = this.repository
      .createQueryBuilder('game')
      .innerJoin('game.players', 'player')
      .where('player.userId = :userId', { userId: dto.userId })
      .andWhere('game.status IN (:...statuses)', {
        statuses: [GameStatus.PENDING_SECOND_PLAYER, GameStatus.ACTIVE],
      });

    this.applyGameRelations(queryBuilder);
    queryBuilder.orderBy('questions.order', 'ASC');

    return await queryBuilder.getOne();
  }

  async getGameByIdForUser(
    gameId: string,
    userId: string,
  ): Promise<PairGame | null> {
    // Проверяем, участвует ли пользователь в игре
    const queryBuilder = this.repository
      .createQueryBuilder('game')
      .innerJoin('game.players', 'player')
      .where('game.id = :gameId', { gameId })
      .andWhere('player.userId = :userId', { userId });

    this.applyGameRelations(queryBuilder);
    queryBuilder.orderBy('questions.order', 'ASC');

    const game = await queryBuilder.getOne();

    // Если игра не найдена (null), проверяем существование игры
    // для правильной обработки ошибок (404 vs 403)
    if (!game) {
      const gameExists = await this.repository.findOne({
        where: { id: gameId },
      });

      if (!gameExists) {
        throw new DomainException({
          code: DomainExceptionCode.NotFound,
          message: 'Game not found!',
          field: 'Game',
        });
      }
    }

    // Если игра существует, но пользователь не участвует, возвращаем null
    // Use case обработает это как Forbidden
    return game;
  }

  /**
   * Получить все игры пользователя (активные и завершенные) с пагинацией
   * Сортировка: активные игры (ACTIVE, PENDING_SECOND_PLAYER) вверху,
   * затем завершенные игры по finishGameDate DESC
   *
   * @usedIn GetMyGamesUseCase - получение истории игр пользователя
   */
  async getMyGames(
    userId: string,
    pageSize: number,
    skip: number,
  ): Promise<[PairGame[], number]> {
    const queryBuilder = this.repository
      .createQueryBuilder('game')
      .innerJoin('game.players', 'player')
      .where('player.userId = :userId', { userId })
      .andWhere('game.status IN (:...statuses)', {
        statuses: [
          GameStatus.PENDING_SECOND_PLAYER,
          GameStatus.ACTIVE,
          GameStatus.FINISHED,
        ],
      });

    this.applyGameRelations(queryBuilder);

    // Сортировка: сначала активные игры (приоритет 0), затем завершенные (приоритет 1)
    // Внутри каждой группы - по finishGameDate DESC
    queryBuilder
      .orderBy(
        `CASE 
          WHEN game.status IN ('${GameStatus.ACTIVE}', '${GameStatus.PENDING_SECOND_PLAYER}') THEN 0
          ELSE 1
        END`,
        'ASC',
      )
      .addOrderBy('game.finish_game_date', 'DESC')
      .addOrderBy('questions.order', 'ASC');

    queryBuilder.limit(pageSize).offset(skip);

    return await queryBuilder.getManyAndCount();
  }
}
