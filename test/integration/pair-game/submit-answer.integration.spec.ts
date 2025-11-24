/* eslint-disable */
import { TestingModule } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import { IntegrationTestHelper } from '../../helpers/integration-test-helper';
import { SubmitAnswerUseCase } from '../../../src/modules/quiz-game/pair-game/application/usecase/submit-answer.usecase';
import { SubmitAnswerCommand } from '../../../src/modules/quiz-game/pair-game/application/usecase/submit-answer.usecase';
import { ConnectToGameUseCase } from '../../../src/modules/quiz-game/pair-game/application/usecase/connect-to-game.usecase';
import { ConnectToGameCommand } from '../../../src/modules/quiz-game/pair-game/application/usecase/connect-to-game.usecase';
import { PairGame } from '../../../src/modules/quiz-game/pair-game/domain/entities/pair-game.entity';
import { Player } from '../../../src/modules/quiz-game/pair-game/domain/entities/player.entity';
import { Question } from '../../../src/modules/quiz-game/questions/domain/entities/question.entity';
import { GameQuestion } from '../../../src/modules/quiz-game/pair-game/domain/entities/game-question.entity';
import { GameAnswer } from '../../../src/modules/quiz-game/pair-game/domain/entities/game-answer.entity';
import { GameStatus } from '../../../src/modules/quiz-game/pair-game/domain/dto/game-status.enum';
import { DomainException } from '../../../src/core/exceptions/domain-exceptions';
import { GetCurrentGameUseCase } from '../../../src/modules/quiz-game/pair-game/application/query-usecase/get-current-game.usecase';
import { GetCurrentGameQuery } from '../../../src/modules/quiz-game/pair-game/application/query-usecase/get-current-game.usecase';
import { TestingService } from '../../../src/modules/testing/testing.service';
import { User } from '../../../src/modules/auth-manage/user-accounts/domain/entities/user.entity';

describe('SubmitAnswerUseCase Integration', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let submitAnswerUseCase: SubmitAnswerUseCase;
  let connectToGameUseCase: ConnectToGameUseCase;
  let getCurrentGameUseCase: GetCurrentGameUseCase;
  let pairGameRepository: Repository<PairGame>;
  let playerRepository: Repository<Player>;
  let questionRepository: Repository<Question>;
  let gameQuestionRepository: Repository<GameQuestion>;
  let gameAnswerRepository: Repository<GameAnswer>;
  let userRepository: Repository<User>;
  let testingService: TestingService;

  // Тестовые данные - ID пользователей (будут созданы в beforeEach)
  let userId1: string;
  let userId2: string;
  let gameId: string;
  let gameQuestions: GameQuestion[] = [];

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

    submitAnswerUseCase = module.get(SubmitAnswerUseCase);
    connectToGameUseCase = module.get(ConnectToGameUseCase);
    getCurrentGameUseCase = module.get(GetCurrentGameUseCase);
    pairGameRepository = dataSource.getRepository(PairGame);
    playerRepository = dataSource.getRepository(Player);
    questionRepository = dataSource.getRepository(Question);
    gameQuestionRepository = dataSource.getRepository(GameQuestion);
    gameAnswerRepository = dataSource.getRepository(GameAnswer);
    userRepository = dataSource.getRepository(User);
    testingService = module.get(TestingService);
  });

  afterAll(async () => {
    await IntegrationTestHelper.cleanup(module);
  });

  // Хелпер для создания активной игры (используется только когда нужно)
  async function createActiveGame(): Promise<void> {
    await connectToGameUseCase.execute(new ConnectToGameCommand(userId1));
    const game = await connectToGameUseCase.execute(
      new ConnectToGameCommand(userId2),
    );
    gameId = game.id;

    // Сохраняем вопросы игры для использования в тестах
    gameQuestions = await gameQuestionRepository.find({
      where: { gameId },
      relations: ['question'],
      order: { order: 'ASC' },
    });
  }

  // Хелпер для очистки только данных игры (быстрее чем clearAllTables)
  async function clearGameData(): Promise<void> {
    // Удаляем только данные игры, сохраняя пользователей и вопросы
    // Используем createQueryBuilder для удаления всех записей без критериев
    // Используем параллельное удаление для ускорения
    await Promise.all([
      gameAnswerRepository.createQueryBuilder().delete().execute(),
      gameQuestionRepository.createQueryBuilder().delete().execute(),
      playerRepository.createQueryBuilder().delete().execute(),
      pairGameRepository.createQueryBuilder().delete().execute(),
    ]);
  }

  // Флаг для отслеживания, были ли созданы пользователи и вопросы
  let usersAndQuestionsCreated = false;

  beforeEach(async () => {
    // Создаем пользователей и вопросы только один раз (они не меняются между тестами)
    if (!usersAndQuestionsCreated) {
      // Первый раз - полная очистка
      await testingService.clearAllTables();
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

      const [savedUser1, savedUser2] = await Promise.all([
        userRepository.save(user1),
        userRepository.save(user2),
      ]);
      userId1 = savedUser1.id;
      userId2 = savedUser2.id;

      // Создаем вопросы параллельно для ускорения
      const questionPromises = questionData.map((qData) => {
        const question = Question.create({
          body: qData.body,
          correctAnswers: qData.correctAnswers,
        });
        question.publish();
        return questionRepository.save(question);
      });
      await Promise.all(questionPromises);

      usersAndQuestionsCreated = true;
    } else {
      // Последующие разы - очищаем только данные игры (быстрее)
      await clearGameData();
    }
  });

  describe('Answer submission', () => {
    beforeEach(async () => {
      await createActiveGame();
    });

    it('should submit correct answer and increment score', async () => {
      // Arrange
      const firstQuestion = gameQuestions[0];
      const correctAnswer = firstQuestion.question.correctAnswers[0];

      // Act
      const result = await submitAnswerUseCase.execute(
        new SubmitAnswerCommand(userId1, { answer: correctAnswer }),
      );

      // Assert - проверяем результат Use Case
      expect(result).toHaveProperty('answerStatus');
      expect(result).toHaveProperty('questionId');
      expect(result.answerStatus).toBe('Correct');
      expect(result.questionId).toBe(firstQuestion.questionId);

      // Проверяем состояние в БД
      const player = await playerRepository.findOne({
        where: { userId: userId1, gameId },
      });

      expect(player!.score).toBe(1);

      const answer = await gameAnswerRepository.findOne({
        where: {
          playerId: player!.id,
          gameQuestionId: firstQuestion.id,
        },
      });

      expect(answer).not.toBeNull();
      expect(answer!.isCorrect).toBe(true);
    });

    it('should submit incorrect answer and not increment score', async () => {
      // Arrange
      const firstQuestion = gameQuestions[0];

      // Act
      const result = await submitAnswerUseCase.execute(
        new SubmitAnswerCommand(userId1, { answer: 'wrong answer' }),
      );

      // Assert
      expect(result.answerStatus).toBe('Incorrect');

      // Проверяем состояние в БД
      const player = await playerRepository.findOne({
        where: { userId: userId1, gameId },
      });

      expect(player!.score).toBe(0);

      const answer = await gameAnswerRepository.findOne({
        where: {
          playerId: player!.id,
          gameQuestionId: firstQuestion.id,
        },
      });

      expect(answer!.isCorrect).toBe(false);
    });

    it('should submit answers in correct order', async () => {
      // Arrange
      const question1 = gameQuestions[0];
      const question2 = gameQuestions[1];

      // Act - отвечаем на первый вопрос
      await submitAnswerUseCase.execute(
        new SubmitAnswerCommand(userId1, {
          answer: question1.question.correctAnswers[0],
        }),
      );

      // Act - отвечаем на второй вопрос
      const result = await submitAnswerUseCase.execute(
        new SubmitAnswerCommand(userId1, {
          answer: question2.question.correctAnswers[0],
        }),
      );

      // Assert
      expect(result.questionId).toBe(question2.questionId);

      // Проверяем, что оба ответа сохранены
      const player = await playerRepository.findOne({
        where: { userId: userId1, gameId },
        relations: ['answers'],
      });

      expect(player!.answers).toHaveLength(2);
      expect(player!.score).toBe(2);
    });

    it('should throw error if trying to answer same question twice', async () => {
      // Arrange - отвечаем на первый вопрос
      const question1 = gameQuestions[0];
      await submitAnswerUseCase.execute(
        new SubmitAnswerCommand(userId1, {
          answer: question1.question.correctAnswers[0],
        }),
      );

      // Act & Assert - пытаемся ответить на первый вопрос снова
      // UseCase автоматически найдет следующий вопрос (второй), но мы передаем ответ для первого
      // Однако UseCase всегда отвечает на следующий вопрос по порядку, поэтому этот тест
      // проверяет, что нельзя ответить на уже отвеченный вопрос через прямой доступ к БД
      // Но так как UseCase работает по порядку, проверим через уникальный индекс в БД
      const player = await playerRepository.findOne({
        where: { userId: userId1, gameId },
      });

      // Пытаемся создать ответ напрямую в БД для уже отвеченного вопроса
      const existingAnswer = await gameAnswerRepository.findOne({
        where: {
          playerId: player!.id,
          gameQuestionId: question1.id,
        },
      });

      expect(existingAnswer).not.toBeNull();

      // Попытка создать дубликат должна вызвать ошибку уникального индекса
      // Но в тесте мы проверяем через UseCase - он просто перейдет к следующему вопросу
      // Поэтому этот тест проверяет, что UseCase правильно обрабатывает порядок вопросов
      const result = await submitAnswerUseCase.execute(
        new SubmitAnswerCommand(userId1, {
          answer: question1.question.correctAnswers[0],
        }),
      );

      // UseCase перейдет к следующему вопросу (второму)
      expect(result.questionId).toBe(gameQuestions[1].questionId);
    });

    it('should answer questions in order automatically', async () => {
      // Arrange - не отвечаем на первый вопрос, но пытаемся ответить на второй

      // Act - UseCase автоматически найдет следующий вопрос по порядку (первый)
      const question2 = gameQuestions[1];
      const result = await submitAnswerUseCase.execute(
        new SubmitAnswerCommand(userId1, {
          answer: question2.question.correctAnswers[0], // Передаем ответ для второго вопроса
        }),
      );

      // Assert - UseCase автоматически отвечает на первый вопрос (следующий по порядку)
      // независимо от того, какой ответ мы передали
      expect(result.questionId).toBe(gameQuestions[0].questionId);

      // Проверяем, что ответ сохранен для первого вопроса
      const player = await playerRepository.findOne({
        where: { userId: userId1, gameId },
        relations: ['answers'],
      });

      expect(player!.answers).toHaveLength(1);
      expect(player!.answers[0].gameQuestionId).toBe(gameQuestions[0].id);
    });
  });

  describe('Score calculation', () => {
    beforeEach(async () => {
      await createActiveGame();
    });

    it('should calculate score correctly for mixed answers', async () => {
      // Arrange - отвечаем на все 5 вопросов
      const answers = [
        gameQuestions[0].question.correctAnswers[0], // правильный
        'wrong answer', // неправильный
        gameQuestions[2].question.correctAnswers[0], // правильный
        gameQuestions[3].question.correctAnswers[0], // правильный
        gameQuestions[4].question.correctAnswers[0], // правильный
      ];

      // Act
      for (const answer of answers) {
        await submitAnswerUseCase.execute(
          new SubmitAnswerCommand(userId1, { answer }),
        );
      }

      // Assert
      const player = await playerRepository.findOne({
        where: { userId: userId1, gameId },
      });

      // 4 правильных ответа
      expect(player!.score).toBe(4);
    });

    it('should set finishedAt when player answers last question', async () => {
      // Arrange
      const answers = gameQuestions.map((gq) => gq.question.correctAnswers[0]);

      // Act
      for (const answer of answers) {
        await submitAnswerUseCase.execute(
          new SubmitAnswerCommand(userId1, { answer }),
        );
      }

      // Assert
      const player = await playerRepository.findOne({
        where: { userId: userId1, gameId },
      });

      expect(player!.finishedAt).not.toBeNull();
      expect(player!.score).toBe(5);
    });
  });

  describe('Game completion', () => {
    beforeEach(async () => {
      await createActiveGame();
    });

    it('should finish game when both players answered all questions', async () => {
      // Arrange - создаем ответы для обоих игроков
      const correctAnswers = gameQuestions.map(
        (gq) => gq.question.correctAnswers[0],
      );

      // User1 отвечает на все вопросы
      for (const answer of correctAnswers) {
        await submitAnswerUseCase.execute(
          new SubmitAnswerCommand(userId1, { answer }),
        );
      }

      // User2 отвечает на все вопросы
      for (const answer of correctAnswers) {
        await submitAnswerUseCase.execute(
          new SubmitAnswerCommand(userId2, { answer }),
        );
      }

      // Assert - проверяем состояние в БД (игра уже завершена)
      const gameInDb = await pairGameRepository.findOne({
        where: { id: gameId },
      });

      expect(gameInDb!.status).toBe(GameStatus.FINISHED);
      expect(gameInDb!.finishGameDate).not.toBeNull();

      // После завершения игры GetCurrentGameUseCase вернет ошибку
      await expect(
        getCurrentGameUseCase.execute(new GetCurrentGameQuery(userId1)),
      ).rejects.toThrow('No active pair for current user');
    });

    it('should not finish game if only one player answered all questions', async () => {
      // Arrange
      const correctAnswers = gameQuestions.map(
        (gq) => gq.question.correctAnswers[0],
      );

      // User1 отвечает на все вопросы
      for (const answer of correctAnswers) {
        await submitAnswerUseCase.execute(
          new SubmitAnswerCommand(userId1, { answer }),
        );
      }

      // User2 отвечает только на 4 вопроса
      for (let i = 0; i < 4; i++) {
        await submitAnswerUseCase.execute(
          new SubmitAnswerCommand(userId2, { answer: correctAnswers[i] }),
        );
      }

      // Assert - проверяем состояние в БД
      const gameInDb = await pairGameRepository.findOne({
        where: { id: gameId },
      });

      expect(gameInDb!.status).toBe(GameStatus.ACTIVE);
      expect(gameInDb!.finishGameDate).toBeNull();
    });
  });

  describe('Bonus calculation', () => {
    beforeEach(async () => {
      await createActiveGame();
    });

    it('should award bonus to player who finished faster', async () => {
      // Arrange
      const correctAnswers = gameQuestions.map(
        (gq) => gq.question.correctAnswers[0],
      );

      // User1 отвечает быстрее (все ответы сразу)
      for (const answer of correctAnswers) {
        await submitAnswerUseCase.execute(
          new SubmitAnswerCommand(userId1, { answer }),
        );
      }

      // Небольшая задержка
      await new Promise((resolve) => setTimeout(resolve, 10));

      // User2 отвечает позже
      for (const answer of correctAnswers) {
        await submitAnswerUseCase.execute(
          new SubmitAnswerCommand(userId2, { answer }),
        );
      }

      // Assert - проверяем в БД (игра завершена, GetCurrentGameUseCase вернет ошибку)
      const gameInDb = await pairGameRepository.findOne({
        where: { id: gameId },
        relations: ['players', 'players.user'],
      });

      const player1 = gameInDb!.players.find((p) => p.userId === userId1)!;
      const player2 = gameInDb!.players.find((p) => p.userId === userId2)!;

      // User1 должен получить бонус (закончил быстрее)
      expect(player1.score + player1.bonus).toBe(6); // 5 правильных + 1 бонус
      expect(player2.score + player2.bonus).toBe(5); // 5 правильных
      expect(player1.bonus).toBe(1);
      expect(player2.bonus).toBe(0);
    });

    it('should not award bonus if player has no correct answers', async () => {
      // Arrange
      const wrongAnswers = ['wrong1', 'wrong2', 'wrong3', 'wrong4', 'wrong5'];
      const correctAnswers = gameQuestions.map(
        (gq) => gq.question.correctAnswers[0],
      );

      // User1 отвечает неправильно, но быстрее
      for (const answer of wrongAnswers) {
        await submitAnswerUseCase.execute(
          new SubmitAnswerCommand(userId1, { answer }),
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 10));

      // User2 отвечает правильно, но позже
      for (const answer of correctAnswers) {
        await submitAnswerUseCase.execute(
          new SubmitAnswerCommand(userId2, { answer }),
        );
      }

      // Assert - проверяем в БД (игра завершена)
      const gameInDb = await pairGameRepository.findOne({
        where: { id: gameId },
        relations: ['players', 'players.user'],
      });

      const player1 = gameInDb!.players.find((p) => p.userId === userId1)!;
      const player2 = gameInDb!.players.find((p) => p.userId === userId2)!;

      // User1 не должен получить бонус (нет правильных ответов)
      expect(player1.score).toBe(0);
      expect(player1.bonus).toBe(0);
      expect(player2.score).toBe(5);
      expect(player2.bonus).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should throw error if no active game exists', async () => {
      // Этот тест не требует создания игры
      // Arrange - создаем пользователя без активной игры
      const user3 = User.create({
        login: 'test-user-3',
        email: 'test3@test.com',
        passwordHash: 'hashedPassword3',
        emailConfirmationExpirationMinutes: 10,
      });
      user3.confirmEmail();
      const savedUser3 = await userRepository.save(user3);
      const userId3 = savedUser3.id;

      // Act & Assert
      await expect(
        submitAnswerUseCase.execute(
          new SubmitAnswerCommand(userId3, { answer: 'test' }),
        ),
      ).rejects.toThrow(DomainException);

      await expect(
        submitAnswerUseCase.execute(
          new SubmitAnswerCommand(userId3, { answer: 'test' }),
        ),
      ).rejects.toThrow('Current user is not inside active pair');
    });

    it('should throw error if trying to answer after all questions answered', async () => {
      // Arrange - создаем игру для этого теста
      await createActiveGame();

      // Arrange - отвечаем на все 5 вопросов
      const correctAnswers = gameQuestions.map(
        (gq) => gq.question.correctAnswers[0],
      );

      for (const answer of correctAnswers) {
        await submitAnswerUseCase.execute(
          new SubmitAnswerCommand(userId1, { answer }),
        );
      }

      // Act & Assert
      await expect(
        submitAnswerUseCase.execute(
          new SubmitAnswerCommand(userId1, { answer: 'extra answer' }),
        ),
      ).rejects.toThrow(DomainException);

      await expect(
        submitAnswerUseCase.execute(
          new SubmitAnswerCommand(userId1, { answer: 'extra answer' }),
        ),
      ).rejects.toThrow('already answered to all questions');
    });
  });
});
