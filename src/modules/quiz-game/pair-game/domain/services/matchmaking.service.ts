import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { PairGame } from '../entities/pair-game.entity';
import { Question } from '../../../questions/domain/entities/question.entity';
import { GAME_CONSTANTS } from '../dto/game.constants';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { PairGameRepository } from '../../infrastructure/pair-game.repository';
import { PlayerRepository } from '../../infrastructure/player.repository';
import { GameQuestionRepository } from '../../infrastructure/game-question.repository';
import { QuestionsRepository } from '../../../questions/infrastructure/questions.repository';

@Injectable()
export class MatchmakingService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly pairGameRepository: PairGameRepository,
    private readonly playerRepository: PlayerRepository,
    private readonly gameQuestionRepository: GameQuestionRepository,
    private readonly questionsRepository: QuestionsRepository,
  ) {}

  async connectUserToGame(userId: string): Promise<PairGame> {
    return await this.dataSource.transaction(async (manager) => {
      // Шаг 1: Проверяем, что пользователь не участвует в активной игре
      await this.pairGameRepository.checkUserNotInActiveGame(
        { userId },
        manager,
      );

      // Шаг 2: Ищем ожидающую игру для подключения
      const waitingGame = await this.pairGameRepository.findWaitingGameForUser(
        { userId },
        manager,
      );

      // Шаг 3: Если найдена ожидающая игра - подключаемся к ней
      if (waitingGame) {
        const questions =
          await this.questionsRepository.getRandomPublishedQuestions(
            GAME_CONSTANTS.QUESTIONS_PER_GAME,
            manager,
          );
        return await this.joinGameToWaitingPlayer(
          waitingGame,
          userId,
          questions,
          manager,
        );
      }

      // Шаг 4: Если ожидающей игры нет - создаем новую игру
      return await this.createNewGame(userId, manager);
    });
  }

  /**
   * Создает новую игру с первым игроком
   */
  private async createNewGame(
    userId: string,
    manager: EntityManager,
  ): Promise<PairGame> {
    const game = await this.pairGameRepository.saveNewGame(manager);
    await this.playerRepository.createFirstPlayer(game.id, userId, manager);
    return game;
  }

  /**
   * Подключает пользователя к ожидающей игре
   * Создает второго игрока, вопросы и начинает игру
   */
  private async joinGameToWaitingPlayer(
    game: PairGame,
    userId: string,
    questions: Question[],
    manager: EntityManager,
  ): Promise<PairGame> {
    if (!game.isPendingSecondPlayer()) {
      throw new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: 'Game can only be started from PendingSecondPlayer status',
        field: 'status',
      });
    }

    await this.playerRepository.createSecondPlayerWithRaceConditionHandling(
      game.id,
      userId,
      manager,
    );

    await this.gameQuestionRepository.createGameQuestions(
      game.id,
      questions,
      manager,
    );
    await this.pairGameRepository.startGame(game, manager);

    return game;
  }
}
