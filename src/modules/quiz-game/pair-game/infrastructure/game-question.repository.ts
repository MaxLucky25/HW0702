import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { GameQuestion } from '../domain/entities/game-question.entity';

@Injectable()
export class GameQuestionRepository {
  constructor(
    @InjectRepository(GameQuestion)
    private readonly repository: Repository<GameQuestion>,
  ) {}

  // ==================== MATCHMAKING METHODS ====================

  /**
   * Создает и сохраняет вопросы для игры
   *
   * @usedIn MatchmakingService.joinGameToWaitingPlayer - создание вопросов при старте игры
   */
  async createGameQuestions(
    gameId: string,
    questions: Array<{ id: string }>,
    manager: EntityManager,
  ): Promise<void> {
    const gameQuestions = questions.map((question, index) =>
      GameQuestion.create({
        gameId,
        questionId: question.id,
        order: index,
      }),
    );
    await manager.save(GameQuestion, gameQuestions);
  }
}
