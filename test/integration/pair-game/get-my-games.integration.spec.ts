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
import { JwtService } from '@nestjs/jwt';
import { GamesSortBy } from '../../../src/modules/quiz-game/pair-game/api/input-dto/get-my-games-query-params.input-dto';
import { SortDirection } from '../../../src/core/dto/base.query-params.input-dto';
import { GetMyGamesUseCase } from '../../../src/modules/quiz-game/pair-game/application/query-usecase/get-my-games.usecase';
import { GetMyGamesQuery } from '../../../src/modules/quiz-game/pair-game/application/query-usecase/get-my-games.usecase';
import { GetMyGamesQueryParams } from '../../../src/modules/quiz-game/pair-game/api/input-dto/get-my-games-query-params.input-dto';
import { GetUserStatisticUseCase } from '../../../src/modules/quiz-game/pair-game/application/query-usecase/get-user-statistic.usecase';
import { GetUserStatisticQuery } from '../../../src/modules/quiz-game/pair-game/application/query-usecase/get-user-statistic.usecase';
import { UserStatistic } from '../../../src/modules/quiz-game/pair-game/domain/entities/user-statistic.entity';

describe('PairGameQueryRepository.getMyGames Integration', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let pairGameQueryRepository: PairGameQueryRepository;
  let connectToGameUseCase: ConnectToGameUseCase;
  let submitAnswerUseCase: SubmitAnswerUseCase;
  let getMyGamesUseCase: GetMyGamesUseCase;
  let getUserStatisticUseCase: GetUserStatisticUseCase;
  let questionRepository: Repository<Question>;
  let gameQuestionRepository: Repository<GameQuestion>;
  let userRepository: Repository<User>;
  let userStatisticRepository: Repository<UserStatistic>;
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
    getMyGamesUseCase = module.get(GetMyGamesUseCase);
    getUserStatisticUseCase = module.get(GetUserStatisticUseCase);
    questionRepository = dataSource.getRepository(Question);
    gameQuestionRepository = dataSource.getRepository(GameQuestion);
    userRepository = dataSource.getRepository(User);
    userStatisticRepository = dataSource.getRepository(UserStatistic);
    jwtService = module.get('ACCESS_JWT_SERVICE');

    // Создаем пользователей ОДИН РАЗ для всех тестов
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

    // Создаем вопросы ОДИН РАЗ для всех тестов
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

  beforeEach(async () => {
    // Не очищаем БД, чтобы данные из первого теста были доступны во втором
    // Пользователи и вопросы уже созданы в beforeAll
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

      // Сохраняем данные в глобальную переменную для следующего теста
      (global as any).testGamesCreated = true;
      console.log('Первый тест завершен, данные созданы');
    }, 60000); // Увеличиваем таймаут до 60 секунд

    it('должен проверить логику GetMyGamesUseCase с пагинацией и маппингом', async () => {
      // Проверяем, что первый тест выполнился
      console.log(
        'Второй тест начался, testGamesCreated:',
        (global as any).testGamesCreated,
      );

      // Ждем немного, чтобы убедиться, что данные из первого теста сохранились
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Проверяем, что данные есть в БД (отладка)
      console.log(`Testing with userId1: ${userId1}`);
      const [debugGames, debugCount] = await pairGameQueryRepository.getMyGames(
        userId1,
        10,
        0,
        GamesSortBy.Status,
        SortDirection.Asc,
      );
      console.log(
        `Debug: totalCount=${debugCount}, games.length=${debugGames.length}`,
      );

      // Создаем query params для use case
      const queryParams = new GetMyGamesQueryParams();
      queryParams.sortBy = GamesSortBy.Status;
      queryParams.sortDirection = SortDirection.Asc;
      queryParams.pageSize = 10;
      queryParams.pageNumber = 1;

      // Выполняем use case
      const result = await getMyGamesUseCase.execute(
        new GetMyGamesQuery(userId1, queryParams),
      );

      // Отладочная информация
      console.log('UseCase result:', {
        pagesCount: result.pagesCount,
        page: result.page,
        pageSize: result.pageSize,
        totalCount: result.totalCount,
        itemsLength: result.items.length,
      });

      // Проверяем структуру ответа use case
      expect(result).toMatchObject({
        pagesCount: 1,
        page: 1,
        pageSize: 10,
        totalCount: 4,
      });

      expect(result.items).toHaveLength(4);

      // Проверяем, что данные правильно замаплены в view DTO
      const firstGame = result.items[0];
      expect(firstGame).toMatchObject({
        id: expect.any(String),
        status: GameStatus.ACTIVE,
        pairCreatedDate: expect.any(String),
        startGameDate: expect.any(String),
        finishGameDate: null,
        firstPlayerProgress: {
          answers: [],
          player: {
            id: userId1,
            login: 'test-user-1',
          },
          score: 0,
        },
        secondPlayerProgress: {
          answers: [],
          player: {
            id: userId2,
            login: 'test-user-2',
          },
          score: 0,
        },
        questions: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            body: expect.any(String),
          }),
        ]),
      });

      // Проверяем сортировку: активная игра первая, остальные завершенные
      expect(result.items[0].status).toBe(GameStatus.ACTIVE);
      for (let i = 1; i < result.items.length; i++) {
        expect(result.items[i].status).toBe(GameStatus.FINISHED);
      }

      // Проверяем, что все даты в правильном формате ISO
      result.items.forEach((game) => {
        expect(game.pairCreatedDate).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        );
        if (game.startGameDate) {
          expect(game.startGameDate).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
          );
        }
        if (game.finishGameDate) {
          expect(game.finishGameDate).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
          );
        }
      });

      // Проверяем пагинацию с другими параметрами
      const queryParamsPage2 = new GetMyGamesQueryParams();
      queryParamsPage2.sortBy = GamesSortBy.Status;
      queryParamsPage2.sortDirection = SortDirection.Asc;
      queryParamsPage2.pageSize = 2;
      queryParamsPage2.pageNumber = 2;

      const resultPage2 = await getMyGamesUseCase.execute(
        new GetMyGamesQuery(userId1, queryParamsPage2),
      );

      expect(resultPage2).toMatchObject({
        pagesCount: 2,
        page: 2,
        pageSize: 2,
        totalCount: 4,
      });
      expect(resultPage2.items).toHaveLength(2);
    }, 60000);
  });

  describe('User Statistics Integration Tests', () => {
    it('должен вернуть пустую статистику для пользователя без игр', async () => {
      // Проверяем статистику для пользователя без игр (user3)
      const result = await getUserStatisticUseCase.execute(
        new GetUserStatisticQuery(userId3),
      );

      // Проверяем, что возвращается пустая статистика
      expect(result).toEqual({
        sumScore: 0,
        avgScores: 0,
        gamesCount: 0,
        winsCount: 0,
        lossesCount: 0,
        drawsCount: 0,
      });

      // Проверяем, что в БД статистика НЕ создалась (должна быть временной)
      const statisticInDb = await userStatisticRepository.findOne({
        where: { userId: userId3 },
      });
      expect(statisticInDb).toBeNull();
    });

    it('должен проверить статистику игроков после существующих игр', async () => {
      // Проверяем статистику user1 (участвовал в играх из предыдущих тестов)
      const user1Statistic = await getUserStatisticUseCase.execute(
        new GetUserStatisticQuery(userId1),
      );

      // user1 участвовал в 4 играх (3 завершенные + 1 активная из предыдущих тестов)
      // Но статистика обновляется только для завершенных игр
      expect(user1Statistic.gamesCount).toBe(3); // 3 завершенные игры
      expect(user1Statistic.sumScore).toBeGreaterThan(0); // Набрал очки
      expect(user1Statistic.winsCount).toBeGreaterThan(0); // Есть победы или ничьи
      expect(user1Statistic.avgScores).toBeGreaterThan(0); // Среднее больше 0

      // Проверяем статистику user2
      const user2Statistic = await getUserStatisticUseCase.execute(
        new GetUserStatisticQuery(userId2),
      );

      expect(user2Statistic.gamesCount).toBe(3); // Тоже 3 завершенные игры
      expect(user2Statistic.sumScore).toBeGreaterThan(0);

      // Проверяем, что статистика сохранена в БД
      const user1StatisticInDb = await userStatisticRepository.findOne({
        where: { userId: userId1 },
      });
      const user2StatisticInDb = await userStatisticRepository.findOne({
        where: { userId: userId2 },
      });

      expect(user1StatisticInDb).not.toBeNull();
      expect(user2StatisticInDb).not.toBeNull();
      expect(user1StatisticInDb!.gamesCount).toBe(3);
      expect(user2StatisticInDb!.gamesCount).toBe(3);
    });

    it('должен правильно вычислять avgScores на основе существующих данных', async () => {
      // Получаем статистику user1
      const user1Statistic = await getUserStatisticUseCase.execute(
        new GetUserStatisticQuery(userId1),
      );

      // Проверяем правильность вычисления среднего
      const expectedAvg = user1Statistic.sumScore / user1Statistic.gamesCount;
      expect(user1Statistic.avgScores).toBe(
        Number.isInteger(expectedAvg)
          ? expectedAvg
          : Math.round(expectedAvg * 100) / 100,
      );

      // Проверяем, что если среднее целое число, то возвращается без десятичных знаков
      if (Number.isInteger(user1Statistic.avgScores)) {
        expect(user1Statistic.avgScores % 1).toBe(0);
      } else {
        // Если дробное, то максимум 2 знака после запятой
        expect(user1Statistic.avgScores.toString()).toMatch(/^\d+\.\d{1,2}$/);
      }
    });

    it('должен проверить корректность подсчета побед/поражений/ничьих', async () => {
      // Получаем статистику обоих игроков
      const user1Statistic = await getUserStatisticUseCase.execute(
        new GetUserStatisticQuery(userId1),
      );
      const user2Statistic = await getUserStatisticUseCase.execute(
        new GetUserStatisticQuery(userId2),
      );

      // Проверяем, что сумма исходов равна количеству игр для каждого игрока
      expect(
        user1Statistic.winsCount +
          user1Statistic.lossesCount +
          user1Statistic.drawsCount,
      ).toBe(user1Statistic.gamesCount);

      expect(
        user2Statistic.winsCount +
          user2Statistic.lossesCount +
          user2Statistic.drawsCount,
      ).toBe(user2Statistic.gamesCount);

      // Проверяем логику: победа одного = поражение другого
      // (в идеальном случае, но тут может быть сложнее из-за разных противников)
      expect(user1Statistic.winsCount).toBeGreaterThanOrEqual(0);
      expect(user1Statistic.lossesCount).toBeGreaterThanOrEqual(0);
      expect(user1Statistic.drawsCount).toBeGreaterThanOrEqual(0);

      expect(user2Statistic.winsCount).toBeGreaterThanOrEqual(0);
      expect(user2Statistic.lossesCount).toBeGreaterThanOrEqual(0);
      expect(user2Statistic.drawsCount).toBeGreaterThanOrEqual(0);
    });

    it('должен проверить структуру ответа UserStatisticViewDto', async () => {
      const result = await getUserStatisticUseCase.execute(
        new GetUserStatisticQuery(userId1),
      );

      // Проверяем, что все поля присутствуют и имеют правильный тип
      expect(result).toMatchObject({
        sumScore: expect.any(Number),
        avgScores: expect.any(Number),
        gamesCount: expect.any(Number),
        winsCount: expect.any(Number),
        lossesCount: expect.any(Number),
        drawsCount: expect.any(Number),
      });

      // Проверяем, что все значения неотрицательные
      expect(result.sumScore).toBeGreaterThanOrEqual(0);
      expect(result.avgScores).toBeGreaterThanOrEqual(0);
      expect(result.gamesCount).toBeGreaterThanOrEqual(0);
      expect(result.winsCount).toBeGreaterThanOrEqual(0);
      expect(result.lossesCount).toBeGreaterThanOrEqual(0);
      expect(result.drawsCount).toBeGreaterThanOrEqual(0);
    });
  });
});
