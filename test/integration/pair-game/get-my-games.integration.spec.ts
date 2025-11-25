/* eslint-disable */
import { TestingModule } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import { IntegrationTestHelper } from '../../helpers/integration-test-helper';
import { PairGameQueryRepository } from '../../../src/modules/quiz-game/pair-game/infrastructure/query/pair-game.query-repository';
import { ConnectToGameUseCase } from '../../../src/modules/quiz-game/pair-game/application/usecase/connect-to-game.usecase';
import { ConnectToGameCommand } from '../../../src/modules/quiz-game/pair-game/application/usecase/connect-to-game.usecase';
import { SubmitAnswerUseCase } from '../../../src/modules/quiz-game/pair-game/application/usecase/submit-answer.usecase';
import { SubmitAnswerCommand } from '../../../src/modules/quiz-game/pair-game/application/usecase/submit-answer.usecase';
import { Question } from '../../../src/modules/quiz-game/questions/domain/entities/question.entity';
import { GameQuestion } from '../../../src/modules/quiz-game/pair-game/domain/entities/game-question.entity';
import { GameStatus } from '../../../src/modules/quiz-game/pair-game/domain/dto/game-status.enum';
import { User } from '../../../src/modules/auth-manage/user-accounts/domain/entities/user.entity';
import { TestingService } from '../../../src/modules/testing/testing.service';
import { JwtService } from '@nestjs/jwt';
import { GamesSortBy } from '../../../src/modules/quiz-game/pair-game/api/input-dto/get-my-games-query-params.input-dto';
import { SortDirection } from '../../../src/core/dto/base.query-params.input-dto';

describe('PairGameQueryRepository.getMyGames Integration', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let pairGameQueryRepository: PairGameQueryRepository;
  let connectToGameUseCase: ConnectToGameUseCase;
  let submitAnswerUseCase: SubmitAnswerUseCase;
  let questionRepository: Repository<Question>;
  let gameQuestionRepository: Repository<GameQuestion>;
  let userRepository: Repository<User>;
  let testingService: TestingService;
  let jwtService: JwtService;

  let userId1: string;
  let userId2: string;
  let userId3: string;

  const questionData = [
    {
      body: 'What is 2+2?',
      correctAnswers: ['4', 'four'],
    },
    {
      body: 'What is the capital of France?',
      correctAnswers: ['Paris'],
    },
    {
      body: 'What is 5*3?',
      correctAnswers: ['15', 'fifteen'],
    },
    {
      body: 'What is the largest planet?',
      correctAnswers: ['Jupiter'],
    },
    {
      body: 'What is 10/2?',
      correctAnswers: ['5', 'five'],
    },
  ];

  beforeAll(async () => {
    const testSetup = await IntegrationTestHelper.createTestingModule();
    module = testSetup.module;
    dataSource = testSetup.dataSource;

    pairGameQueryRepository = module.get(PairGameQueryRepository);
    connectToGameUseCase = module.get(ConnectToGameUseCase);
    submitAnswerUseCase = module.get(SubmitAnswerUseCase);
    questionRepository = dataSource.getRepository(Question);
    gameQuestionRepository = dataSource.getRepository(GameQuestion);
    userRepository = dataSource.getRepository(User);
    testingService = module.get(TestingService);
    jwtService = module.get('ACCESS_JWT_SERVICE');
  });

  beforeEach(async () => {
    await testingService.clearAllTables();

    // Создаем пользователей
    const user1 = User.create({
      login: 'test-user-1',
      email: 'test1@test.com',
      passwordHash: 'hashedPassword1',
      emailConfirmationExpirationMinutes: 10,
    });
    user1.confirmEmail();

    const user2 = User.create({
      login: 'test-user-2',
      email: 'test2@test.com',
      passwordHash: 'hashedPassword2',
      emailConfirmationExpirationMinutes: 10,
    });
    user2.confirmEmail();

    const user3 = User.create({
      login: 'test-user-3',
      email: 'test3@test.com',
      passwordHash: 'hashedPassword3',
      emailConfirmationExpirationMinutes: 10,
    });
    user3.confirmEmail();

    const [savedUser1, savedUser2, savedUser3] = await Promise.all([
      userRepository.save(user1),
      userRepository.save(user2),
      userRepository.save(user3),
    ]);
    userId1 = savedUser1.id;
    userId2 = savedUser2.id;
    userId3 = savedUser3.id;

    // Создаем вопросы
    const questionPromises = questionData.map((qData) => {
      const question = Question.create({
        body: qData.body,
        correctAnswers: qData.correctAnswers,
      });
      question.publish();
      return questionRepository.save(question);
    });
    await Promise.all(questionPromises);
  });

  describe('getMyGames - тест для заполнения БД и получения JWT', () => {
    // Этот тест используется для заполнения базы данных тестовыми данными
    // и вывода JWT токена для ручного тестирования через Postman
    it('должен создать тестовые данные и вывести JWT токен', async () => {
      // Создаем 3 завершенные игры
      for (let i = 0; i < 3; i++) {
        // Подключаем первого игрока
        await connectToGameUseCase.execute(new ConnectToGameCommand(userId1));

        // Подключаем второго игрока (игра становится активной)
        const game = await connectToGameUseCase.execute(
          new ConnectToGameCommand(userId2),
        );

        // Получаем вопросы игры
        const gameQuestions = await gameQuestionRepository.find({
          where: { gameId: game.id },
          relations: ['question'],
          order: { order: 'ASC' },
        });

        // Отправляем все ответы для обоих игроков (завершаем игру)
        for (const gameQuestion of gameQuestions) {
          await submitAnswerUseCase.execute(
            new SubmitAnswerCommand(userId1, {
              answer: gameQuestion.question.correctAnswers[0],
            }),
          );
          await submitAnswerUseCase.execute(
            new SubmitAnswerCommand(userId2, {
              answer: gameQuestion.question.correctAnswers[0],
            }),
          );
        }
      }

      // Создаем 1 активную игру (не завершенную)
      await connectToGameUseCase.execute(new ConnectToGameCommand(userId1));
      await connectToGameUseCase.execute(new ConnectToGameCommand(userId2));

      // Получаем игры пользователя
      const [games, totalCount] = await pairGameQueryRepository.getMyGames(
        userId1,
        10, // pageSize
        0, // skip
        GamesSortBy.Status, // sortBy
        SortDirection.Asc, // sortDirection
      );

      // Генерируем JWT токен для тестирования
      const jwtToken = jwtService.sign({ id: userId1 });

      console.log(`\n=== JWT для Postman тестирования ===`);
      console.log(`User ID: ${userId1}`);
      console.log(`JWT Token: ${jwtToken}`);
      console.log(
        `URL: GET /pair-game-quiz/pairs/my?sortBy=status&sortDirection=asc`,
      );
      console.log(`Authorization: Bearer ${jwtToken}`);

      // Проверяем результаты
      expect(totalCount).toBe(4); // Ожидаем 4 игры
      expect(games.length).toBe(4); // Ожидаем 4 игры в массиве

      // Проверяем сортировку: активная игра должна быть первой
      expect(games[0].status).toBe(GameStatus.ACTIVE);

      // Остальные игры должны быть завершенными
      for (let i = 1; i < games.length; i++) {
        expect(games[i].status).toBe(GameStatus.FINISHED);
      }
    }, 60000); // Увеличиваем таймаут до 60 секунд
  });
});
