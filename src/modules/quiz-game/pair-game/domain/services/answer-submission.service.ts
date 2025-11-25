import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { PairGame } from '../entities/pair-game.entity';
import { GameAnswer } from '../entities/game-answer.entity';
import { GAME_CONSTANTS } from '../dto/game.constants';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { PlayerRepository } from '../../infrastructure/player.repository';
import { PairGameRepository } from '../../infrastructure/pair-game.repository';
import { UserStatisticRepository } from '../../infrastructure/user-statistic.repository';

@Injectable()
export class AnswerSubmissionService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly pairGameRepository: PairGameRepository,
    private readonly playerRepository: PlayerRepository,
    private readonly userStatisticRepository: UserStatisticRepository,
  ) {}

  async submitAnswer(userId: string, answer: string): Promise<GameAnswer> {
    return await this.dataSource.transaction(async (manager) => {
      // 1-3. Найти игрока с игрой и ответами в одном запросе (findOne с relations)
      const player = await this.playerRepository.findPlayerWithGameAndAnswers(
        { userId },
        manager,
      );

      if (!player || !player.game) {
        throw new DomainException({
          code: DomainExceptionCode.Forbidden,
          message:
            'Current user is not inside active pair or user is in active pair but has already answered to all questions',
          field: 'Game',
        });
      }

      const game = player.game;

      // Проверяем статус игры
      if (!game.isActive()) {
        throw new DomainException({
          code: DomainExceptionCode.Forbidden,
          message:
            'Current user is not inside active pair or user is in active pair but has already answered to all questions',
          field: 'Game',
        });
      }

      // Считаем ответы из загруженных данных (не нужен отдельный запрос)
      const answersCount = player.answers?.length || 0;

      // 4. Проверить лимит ответов
      if (answersCount >= GAME_CONSTANTS.QUESTIONS_PER_GAME) {
        throw new DomainException({
          code: DomainExceptionCode.Forbidden,
          message:
            'Current user is not inside active pair or user is in active pair but has already answered to all questions',
          field: 'Game',
        });
      }

      // 5. Найти следующий вопрос из уже загруженных данных
      if (!game.questions || game.questions.length === 0) {
        throw new DomainException({
          code: DomainExceptionCode.NotFound,
          message: 'Next question not found',
          field: 'GameQuestion',
        });
      }

      const nextQuestion = game.questions.find((q) => q.order === answersCount);

      if (!nextQuestion) {
        throw new DomainException({
          code: DomainExceptionCode.NotFound,
          message: 'Next question not found',
          field: 'GameQuestion',
        });
      }

      // 6. Проверить существующий ответ из уже загруженных данных
      const existingAnswer = player.answers?.find(
        (answer) => answer.gameQuestionId === nextQuestion.id,
      );

      if (existingAnswer) {
        throw new DomainException({
          code: DomainExceptionCode.BadRequest,
          message: 'Answer already submitted for this question',
          field: 'GameAnswer',
        });
      }

      // 7. Проверить правильность ответа
      const isCorrect = nextQuestion.question.isAnswerCorrect(answer);

      // 8. Создать и сохранить ответ
      const answerEntity = GameAnswer.create({
        gameQuestionId: nextQuestion.id,
        playerId: player.id,
        answer: answer,
        isCorrect: isCorrect,
      });

      const savedAnswer = await manager.save(GameAnswer, answerEntity);

      // 9. Обновить счет игрока и получить обновленный объект
      const updatedPlayer = await this.playerRepository.updatePlayerScore(
        player,
        isCorrect,
        nextQuestion.isLast(),
        manager,
      );

      // Синхронизируем объект игрока в game.players с обновленным player
      const playerInGame = game.players.find((p) => p.id === updatedPlayer.id);
      if (playerInGame) {
        playerInGame.score = updatedPlayer.score;
        playerInGame.finishedAt = updatedPlayer.finishedAt;
      }

      // 10. Проверить и завершить игру если нужно
      await this.checkAndFinishGame(game, manager);

      // 11. Использовать сохраненный объект
      savedAnswer.gameQuestion = nextQuestion;
      return savedAnswer;
    });
  }

  private async checkAndFinishGame(
    game: PairGame,
    manager: EntityManager,
  ): Promise<void> {
    // Используем уже загруженных игроков игры для проверки завершения
    if (!game.players || game.players.length === 0) {
      return;
    }

    const allPlayersFinished = game.players.every((p) => p.hasFinished());

    if (allPlayersFinished) {
      // Вычисляем бонусы
      const firstPlayer = game.players.find((p) => p.isFirstPlayer());
      const secondPlayer = game.players.find((p) => p.isSecondPlayer());

      if (firstPlayer && secondPlayer) {
        // Бонус получает тот, кто закончил быстрее И имеет хотя бы один правильный ответ
        if (firstPlayer.finishedAt && secondPlayer.finishedAt) {
          const fasterPlayer =
            firstPlayer.finishedAt < secondPlayer.finishedAt
              ? firstPlayer
              : secondPlayer;

          if (fasterPlayer.score > 0) {
            fasterPlayer.awardBonus();
          }
        }

        // Сохраняем игроков
        await this.playerRepository.savePlayers(
          [firstPlayer, secondPlayer],
          manager,
        );
      }

      // Завершаем игру
      await this.pairGameRepository.finishGame(game, manager);

      // Обновляем статистику игроков после завершения игры
      if (firstPlayer && secondPlayer) {
        // Безопасное вычисление счетов с защитой от NaN
        const firstPlayerScore =
          (firstPlayer.score || 0) + (firstPlayer.bonus || 0);
        const secondPlayerScore =
          (secondPlayer.score || 0) + (secondPlayer.bonus || 0);

        // Обновляем статистику для первого игрока
        await this.userStatisticRepository.updateStatisticAfterGame(
          firstPlayer.userId,
          firstPlayerScore,
          secondPlayerScore,
          manager,
        );

        // Обновляем статистику для второго игрока
        await this.userStatisticRepository.updateStatisticAfterGame(
          secondPlayer.userId,
          secondPlayerScore,
          firstPlayerScore,
          manager,
        );
      }
    }
  }
}
