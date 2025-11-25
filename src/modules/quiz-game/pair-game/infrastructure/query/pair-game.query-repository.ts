import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { PairGame } from '../../domain/entities/pair-game.entity';
import { FindActiveGameByUserIdDto } from '../dto/pair-game-repo.dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { GameStatus } from '../../domain/dto/game-status.enum';
import { SortDirection } from '../../../../../core/dto/base.query-params.input-dto';
import { GamesSortBy } from '../../api/input-dto/get-my-games-query-params.input-dto';

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
   *
   * @usedIn GetMyGamesUseCase - получение истории игр пользователя
   */
  async getMyGames(
    userId: string,
    pageSize: number,
    skip: number,
    sortBy: GamesSortBy,
    sortDirection: SortDirection,
  ): Promise<[PairGame[], number]> {
    // ========== ЗАГРУЗКА ДАННЫХ ИЗ БД ==========
    // Используем Query Builder для правильной загрузки всех игроков игры
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

    // Применяем relations для загрузки всех необходимых данных
    this.applyGameRelations(queryBuilder);
    queryBuilder.orderBy('questions.order', 'ASC');

    const [allGames, totalCount] = await queryBuilder.getManyAndCount();

    // ========== СОРТИРОВКА В ПАМЯТИ ==========
    // Преобразуем направление сортировки в числовой множитель:
    // SortDirection.Desc → -1 (по убыванию: 3, 2, 1...)
    // SortDirection.Asc → 1 (по возрастанию: 1, 2, 3...)
    const direction = sortDirection === SortDirection.Desc ? -1 : 1;

    // Сортируем массив игр с помощью функции сравнения
    allGames.sort((a, b) => {
      // ===== СОРТИРОВКА ПО СТАТУСУ =====
      if (sortBy === GamesSortBy.Status) {
        // Определяем приоритет каждого статуса (меньше число = выше приоритет)
        const statusOrder = {
          [GameStatus.ACTIVE]: 1, // Активные игры - самый высокий приоритет
          [GameStatus.PENDING_SECOND_PLAYER]: 2, // Ожидающие игры - средний приоритет
          [GameStatus.FINISHED]: 3, // Завершенные игры - низкий приоритет
        };

        // Вычисляем разность приоритетов и применяем направление сортировки
        // Пример: Active(1) vs Finished(3) при ASC: (1-3)*1 = -2 → Active идет первым ✅
        // Пример: Active(1) vs Finished(3) при DESC: (1-3)*(-1) = 2 → Finished идет первым ✅
        const statusDiff =
          (statusOrder[a.status] - statusOrder[b.status]) * direction;

        // Если статусы разные - возвращаем результат сравнения по статусу
        if (statusDiff !== 0) return statusDiff;

        // ВТОРИЧНАЯ СОРТИРОВКА: если статусы одинаковые - сортируем по дате создания
        // Всегда DESC (новые игры сверху), независимо от параметра direction
        return +b.createdAt - +a.createdAt;
      }
      // ===== СОРТИРОВКА ПО ДАТЕ СОЗДАНИЯ =====
      else if (sortBy === GamesSortBy.PairCreatedDate) {
        // Простое сравнение дат с учетом направления
        // ASC: старые игры сначала, DESC: новые игры сначала
        return (+a.createdAt - +b.createdAt) * direction;
      }

      // Если sortBy не распознан - не меняем порядок
      return 0;
    });

    // ========== ПАГИНАЦИЯ ==========
    // Применяем пагинацию ПОСЛЕ сортировки - берем нужный срез массива
    // skip = (pageNumber - 1) * pageSize - количество записей для пропуска
    // Пример: страница 2, размер 10 → skip = 10, берем элементы с 10 по 19
    const paginatedGames = allGames.slice(skip, skip + pageSize);

    // Возвращаем [отсортированные_и_пагинированные_игры, общее_количество_игр]
    return [paginatedGames, totalCount];
  }
}
