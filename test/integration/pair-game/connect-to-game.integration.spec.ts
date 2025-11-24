/* eslint-disable */
import { TestingModule } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import { IntegrationTestHelper } from '../../helpers/integration-test-helper';
import { ConnectToGameUseCase } from '../../../src/modules/quiz-game/pair-game/application/usecase/connect-to-game.usecase';
import { ConnectToGameCommand } from '../../../src/modules/quiz-game/pair-game/application/usecase/connect-to-game.usecase';
import { PairGame } from '../../../src/modules/quiz-game/pair-game/domain/entities/pair-game.entity';
import { Question } from '../../../src/modules/quiz-game/questions/domain/entities/question.entity';
import { QuestionsRepository } from '../../../src/modules/quiz-game/questions/infrastructure/questions.repository';
import { GameStatus } from '../../../src/modules/quiz-game/pair-game/domain/dto/game-status.enum';
import { DomainException } from '../../../src/core/exceptions/domain-exceptions';
import { TestingService } from '../../../src/modules/testing/testing.service';
import { User } from '../../../src/modules/auth-manage/user-accounts/domain/entities/user.entity';

describe('ConnectToGameUseCase Integration', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let useCase: ConnectToGameUseCase;
  let questionsRepository: QuestionsRepository;
  let pairGameRepository: Repository<PairGame>;
  let questionRepository: Repository<Question>;
  let userRepository: Repository<User>;
  let testingService: TestingService;

  // Тестовые данные - ID пользователей (будут созданы в beforeEach)
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

    useCase = module.get(ConnectToGameUseCase);
    questionsRepository = module.get(QuestionsRepository);
    pairGameRepository = dataSource.getRepository(PairGame);
    questionRepository = dataSource.getRepository(Question);
    userRepository = dataSource.getRepository(User);
    testingService = module.get(TestingService);
  });

  afterAll(async () => {
    await IntegrationTestHelper.cleanup(module);
  });

  beforeEach(async () => {
    // Очищаем данные перед каждым тестом
    // Используем TestingService.clearAllTables() который использует TRUNCATE ... CASCADE
    // и правильно обрабатывает foreign key constraints
    await testingService.clearAllTables();

    // Восстанавливаем пользователей параллельно для ускорения
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

    // Восстанавливаем вопросы параллельно для ускорения
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

  describe('Game creation', () => {
    it('should create new game when no waiting game exists', async () => {
      // Act
      const result = await useCase.execute(new ConnectToGameCommand(userId1));

      // Assert - проверяем результат через Use Case
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('status');
      expect(result.status).toBe(GameStatus.PENDING_SECOND_PLAYER);
      expect(result.firstPlayerProgress.player.id).toBe(userId1);
      expect(result.secondPlayerProgress).toBeNull();
      expect(result.questions).toBeNull();

      // Проверяем, что игра сохранена в БД
      const gameInDb = await pairGameRepository.findOne({
        where: { id: result.id },
        relations: ['players'],
      });

      expect(gameInDb).not.toBeNull();
      expect(gameInDb!.status).toBe(GameStatus.PENDING_SECOND_PLAYER);
      expect(gameInDb!.players).toHaveLength(1);
      expect(gameInDb!.players[0].userId).toBe(userId1);
    });

    it('should throw error if user already has active game', async () => {
      // Arrange - создаем активную игру для пользователя
      await useCase.execute(new ConnectToGameCommand(userId1));
      await useCase.execute(new ConnectToGameCommand(userId2));

      // Act & Assert
      await expect(
        useCase.execute(new ConnectToGameCommand(userId1)),
      ).rejects.toThrow(DomainException);

      await expect(
        useCase.execute(new ConnectToGameCommand(userId1)),
      ).rejects.toThrow('Current user is already participating in active pair');
    });
  });

  describe('Game connection', () => {
    it('should connect second player to waiting game', async () => {
      // Arrange - создаем ожидающую игру
      const game1 = await useCase.execute(new ConnectToGameCommand(userId1));

      // Act - второй игрок подключается
      const game2 = await useCase.execute(new ConnectToGameCommand(userId2));

      // Assert - проверяем результат
      expect(game2.id).toBe(game1.id);
      expect(game2.status).toBe(GameStatus.ACTIVE);
      expect(game2.firstPlayerProgress.player.id).toBe(userId1);
      expect(game2.secondPlayerProgress).not.toBeNull();
      expect(game2.secondPlayerProgress!.player.id).toBe(userId2);
      expect(game2.questions).not.toBeNull();
      expect(game2.questions!.length).toBe(5);
      expect(game2.startGameDate).not.toBeNull();

      // Проверяем состояние в БД
      const gameInDb = await pairGameRepository.findOne({
        where: { id: game2.id },
        relations: ['players', 'questions'],
      });

      expect(gameInDb!.status).toBe(GameStatus.ACTIVE);
      expect(gameInDb!.players).toHaveLength(2);
      expect(gameInDb!.questions).toHaveLength(5);
      expect(gameInDb!.startGameDate).not.toBeNull();
    });

    it('should create new game if no waiting game exists', async () => {
      // Arrange - создаем игру для первого пользователя и подключаем второго
      // чтобы игра стала ACTIVE и больше не была доступна для матчмейкинга
      await useCase.execute(new ConnectToGameCommand(userId1));
      await useCase.execute(new ConnectToGameCommand(userId2));

      // Act - третий пользователь создает новую игру (так как нет ожидающих игр)
      const newGame = await useCase.execute(new ConnectToGameCommand(userId3));

      // Assert
      expect(newGame.status).toBe(GameStatus.PENDING_SECOND_PLAYER);
      expect(newGame.firstPlayerProgress.player.id).toBe(userId3);
    });
  });

  describe('Questions assignment', () => {
    it('should assign 5 random published questions when game starts', async () => {
      // Arrange
      await useCase.execute(new ConnectToGameCommand(userId1));

      // Act
      const game = await useCase.execute(new ConnectToGameCommand(userId2));

      // Assert
      expect(game.questions).not.toBeNull();
      expect(game.questions!.length).toBe(5);

      // Проверяем, что вопросы сохранены в БД
      const gameInDb = await pairGameRepository.findOne({
        where: { id: game.id },
        relations: ['questions', 'questions.question'],
      });

      expect(gameInDb!.questions).toHaveLength(5);
      // Проверяем, что все вопросы опубликованы
      gameInDb!.questions.forEach((gq) => {
        expect(gq.question.published).toBe(true);
      });
    });
  });
});
