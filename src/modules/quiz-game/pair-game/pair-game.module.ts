import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { PairGame } from './domain/entities/pair-game.entity';
import { Player } from './domain/entities/player.entity';
import { GameQuestion } from './domain/entities/game-question.entity';
import { GameAnswer } from './domain/entities/game-answer.entity';
import { UserStatistic } from './domain/entities/user-statistic.entity';
import { Question } from '../questions/domain/entities/question.entity';
import { PairGameRepository } from './infrastructure/pair-game.repository';
import { PlayerRepository } from './infrastructure/player.repository';
import { GameQuestionRepository } from './infrastructure/game-question.repository';
import { GameAnswerRepository } from './infrastructure/game-answer.repository';
import { PairGameQueryRepository } from './infrastructure/query/pair-game.query-repository';
import { UserStatisticRepository } from './infrastructure/user-statistic.repository';
import { MatchmakingService } from './domain/services/matchmaking.service';
import { AnswerSubmissionService } from './domain/services/answer-submission.service';
import { PairGameController } from './api/pair-game.controller';
import { GetCurrentGameUseCase } from './application/query-usecase/get-current-game.usecase';
import { GetGameByIdUseCase } from './application/query-usecase/get-game-by-id.usecase';
import { GetMyGamesUseCase } from './application/query-usecase/get-my-games.usecase';
import { GetUserStatisticUseCase } from './application/query-usecase/get-user-statistic.usecase';
import { ConnectToGameUseCase } from './application/usecase/connect-to-game.usecase';
import { SubmitAnswerUseCase } from './application/usecase/submit-answer.usecase';
import { QuestionsModule } from '../questions/questions.module';

const QueryHandlers = [
  GetCurrentGameUseCase,
  GetGameByIdUseCase,
  GetMyGamesUseCase,
  GetUserStatisticUseCase,
];

const CommandHandlers = [ConnectToGameUseCase, SubmitAnswerUseCase];

@Module({
  imports: [
    CqrsModule,
    QuestionsModule,
    TypeOrmModule.forFeature([
      PairGame,
      Player,
      GameQuestion,
      GameAnswer,
      UserStatistic,
      Question,
    ]),
  ],
  controllers: [PairGameController],
  providers: [
    ...QueryHandlers,
    ...CommandHandlers,
    PairGameRepository,
    PlayerRepository,
    GameQuestionRepository,
    GameAnswerRepository,
    PairGameQueryRepository,
    UserStatisticRepository,
    MatchmakingService,
    AnswerSubmissionService,
  ],
  exports: [
    PairGameRepository,
    PlayerRepository,
    GameQuestionRepository,
    GameAnswerRepository,
    PairGameQueryRepository,
  ],
})
export class PairGameModule {}
