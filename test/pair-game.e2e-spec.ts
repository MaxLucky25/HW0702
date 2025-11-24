/* eslint-disable */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';
import { E2ETestHelper } from './helpers/e2e-test-helper';
import { CreateUserInputDto } from '../src/modules/auth-manage/user-accounts/api/input-dto/users.input-dto';
import { QuestionInputDto } from '../src/modules/quiz-game/questions/api/input-dto/question.input.dto';
import { PublishQuestionInputDto } from '../src/modules/quiz-game/questions/api/input-dto/publish-question.input.dto';
import { SubmitAnswerInputDto } from '../src/modules/quiz-game/pair-game/api/input-dto/submit-answer.input.dto';
import { PairGameViewDto } from '../src/modules/quiz-game/pair-game/api/view-dto/pair-game.view-dto';
import { AnswerViewDto } from '../src/modules/quiz-game/pair-game/api/view-dto/answer.view-dto';

describe('PairGameController (e2e)', () => {
  let app: INestApplication;
  let server: Server;

  const basicAuth = 'Basic ' + Buffer.from('admin:qwerty').toString('base64');

  // Данные для пользователей
  let user1Token: string;
  let user2Token: string;
  let user1Id: string;
  let user2Id: string;

  // Данные для вопросов
  const questions: Array<{ id: string; correctAnswers: string[] }> = [];

  beforeAll(async () => {
    const testSetup = await E2ETestHelper.createTestingApp();
    app = testSetup.app;
    server = testSetup.server;

    // Создаем и логиним двух пользователей
    const user1Data: CreateUserInputDto = {
      login: 'player1',
      password: 'password123',
      email: 'player1@test.com',
    };

    const user2Data: CreateUserInputDto = {
      login: 'player2',
      password: 'password123',
      email: 'player2@test.com',
    };

    // Создаем пользователей
    const user1Response = await request(server)
      .post('/sa/users')
      .set('Authorization', basicAuth)
      .send(user1Data)
      .expect(201);

    const user2Response = await request(server)
      .post('/sa/users')
      .set('Authorization', basicAuth)
      .send(user2Data)
      .expect(201);

    user1Id = user1Response.body.id;
    user2Id = user2Response.body.id;

    // Логиним пользователей
    const login1Response = await request(server)
      .post('/auth/login')
      .send({
        loginOrEmail: user1Data.login,
        password: user1Data.password,
      })
      .expect(200);

    const login2Response = await request(server)
      .post('/auth/login')
      .send({
        loginOrEmail: user2Data.login,
        password: user2Data.password,
      })
      .expect(200);

    user1Token = login1Response.body.accessToken;
    user2Token = login2Response.body.accessToken;

    // Создаем и публикуем 5 вопросов
    const questionData: QuestionInputDto[] = [
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

    for (const qData of questionData) {
      const questionResponse = await request(server)
        .post('/sa/quiz/questions')
        .set('Authorization', basicAuth)
        .send(qData)
        .expect(201);

      const questionId = questionResponse.body.id;

      // Публикуем вопрос
      const publishData: PublishQuestionInputDto = {
        published: true,
      };

      await request(server)
        .put(`/sa/quiz/questions/${questionId}/publish`)
        .set('Authorization', basicAuth)
        .send(publishData)
        .expect(204);

      questions.push({
        id: questionId,
        correctAnswers: qData.correctAnswers,
      });
    }
  });

  afterAll(async () => {
    await E2ETestHelper.cleanup(app, server);
  });

  describe('Complete game flow', () => {
    let gameId: string;
    let gameQuestions: Array<{
      id: string;
      body: string;
      correctAnswers: string[];
    }> = [];

    it('Step 1: should create a new game by user1', async () => {
      // User1 создает игру
      const createGameResponse = await request(server)
        .post('/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const game1: PairGameViewDto = createGameResponse.body;
      gameId = game1.id;

      expect(game1.id).toBeDefined();
      expect(game1.status).toBe('PendingSecondPlayer');
      expect(game1.firstPlayerProgress.player.id).toBe(user1Id);
      expect(game1.firstPlayerProgress.player.login).toBe('player1');
      expect(game1.secondPlayerProgress).toBeNull();
      expect(game1.questions).toBeNull();
    });

    it('Step 2: should connect user2 to the game and get questions', async () => {
      // User2 подключается к игре
      const connectGameResponse = await request(server)
        .post('/pair-game-quiz/pairs/connection')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      const game2: PairGameViewDto = connectGameResponse.body;

      expect(game2.id).toBe(gameId);
      expect(game2.status).toBe('Active');
      expect(game2.firstPlayerProgress.player.id).toBe(user1Id);
      expect(game2.secondPlayerProgress).not.toBeNull();
      expect(game2.secondPlayerProgress!.player.id).toBe(user2Id);
      expect(game2.secondPlayerProgress!.player.login).toBe('player2');
      expect(game2.questions).not.toBeNull();
      expect(game2.questions!.length).toBe(5);
      expect(game2.startGameDate).not.toBeNull();

      // Сохраняем вопросы из игры для использования правильных ответов
      // Нужно получить правильные ответы из базы данных
      for (const q of game2.questions!) {
        const questionResponse = await request(server)
          .get(`/sa/quiz/questions/${q.id}`)
          .set('Authorization', basicAuth)
          .expect(200);

        gameQuestions.push({
          id: q.id,
          body: q.body,
          correctAnswers: questionResponse.body.correctAnswers,
        });
      }

      // Сортируем вопросы по порядку (как они идут в игре)
      expect(gameQuestions.length).toBe(5);
    });

    it('Step 3: should get current game for both players', async () => {
      // User1 получает текущую игру
      const user1GameResponse = await request(server)
        .get('/pair-game-quiz/pairs/my-current')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const user1Game: PairGameViewDto = user1GameResponse.body;
      expect(user1Game.id).toBe(gameId);
      expect(user1Game.status).toBe('Active');
      expect(user1Game.firstPlayerProgress.player.id).toBe(user1Id);

      // User2 получает текущую игру
      const user2GameResponse = await request(server)
        .get('/pair-game-quiz/pairs/my-current')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      const user2Game: PairGameViewDto = user2GameResponse.body;
      expect(user2Game.id).toBe(gameId);
      expect(user2Game.id).toBe(user1Game.id);
      expect(user2Game.status).toBe('Active');
      expect(user2Game.secondPlayerProgress!.player.id).toBe(user2Id);
    });

    it('Step 4: should submit first answers and track progress', async () => {
      // User1 дает правильный ответ на первый вопрос (используем первый правильный ответ из вопроса)
      const firstQuestion = gameQuestions[0];
      const answer1: SubmitAnswerInputDto = {
        answer: firstQuestion.correctAnswers[0],
      };

      const answer1Response = await request(server)
        .post('/pair-game-quiz/pairs/my-current/answers')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(answer1)
        .expect(200);

      const answer1Result: AnswerViewDto = answer1Response.body;
      expect(answer1Result.answerStatus).toBe('Correct');
      expect(answer1Result.questionId).toBe(firstQuestion.id);

      // Проверяем прогресс User1
      const progress1Response = await request(server)
        .get('/pair-game-quiz/pairs/my-current')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const progress1: PairGameViewDto = progress1Response.body;
      expect(progress1.firstPlayerProgress.answers).toHaveLength(1);
      expect(progress1.firstPlayerProgress.score).toBe(1);
      expect(progress1.firstPlayerProgress.answers[0].answerStatus).toBe(
        'Correct',
      );

      // User2 дает неправильный ответ на первый вопрос
      const answer2: SubmitAnswerInputDto = {
        answer: 'wrong answer',
      };

      const answer2Response = await request(server)
        .post('/pair-game-quiz/pairs/my-current/answers')
        .set('Authorization', `Bearer ${user2Token}`)
        .send(answer2)
        .expect(200);

      const answer2Result: AnswerViewDto = answer2Response.body;
      expect(answer2Result.answerStatus).toBe('Incorrect');

      // Проверяем прогресс User2
      const progress2Response = await request(server)
        .get('/pair-game-quiz/pairs/my-current')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      const progress2: PairGameViewDto = progress2Response.body;
      expect(progress2.secondPlayerProgress!.answers).toHaveLength(1);
      expect(progress2.secondPlayerProgress!.score).toBe(0);
      expect(progress2.secondPlayerProgress!.answers[0].answerStatus).toBe(
        'Incorrect',
      );
    });

    it('Step 5: should continue submitting answers with mixed results', async () => {
      // В Step 4 оба игрока уже ответили на вопрос 1 (gameQuestions[0])
      // Теперь нужно ответить на вопросы 2, 3, 4, 5 (gameQuestions[1], [2], [3], [4])
      // User1: правильный на вопрос 2, неправильный на вопрос 3, правильный на вопрос 4, правильный на вопрос 5
      const user1Answers = [
        gameQuestions[1].correctAnswers[0], // правильный ответ на 2-й вопрос (индекс 1)
        'wrong answer', // неправильный ответ на 3-й вопрос (индекс 2)
        gameQuestions[3].correctAnswers[0], // правильный ответ на 4-й вопрос (индекс 3)
        gameQuestions[4].correctAnswers[0], // правильный ответ на 5-й вопрос (индекс 4)
      ];

      // User2: правильный на вопрос 2, правильный на вопрос 3, неправильный на вопрос 4, правильный на вопрос 5
      const user2Answers = [
        gameQuestions[1].correctAnswers[0], // правильный ответ на 2-й вопрос (индекс 1)
        gameQuestions[2].correctAnswers[0], // правильный ответ на 3-й вопрос (индекс 2)
        'wrong answer', // неправильный ответ на 4-й вопрос (индекс 3)
        gameQuestions[4].correctAnswers[0], // правильный ответ на 5-й вопрос (индекс 4)
      ];

      // Отправляем ответы поочередно: user1, user2, user1, user2...
      // Это имитирует реальную игру, где игроки отвечают по очереди
      for (let i = 0; i < user1Answers.length; i++) {
        // User1 отвечает
        const answer1: SubmitAnswerInputDto = { answer: user1Answers[i] };
        await request(server)
          .post('/pair-game-quiz/pairs/my-current/answers')
          .set('Authorization', `Bearer ${user1Token}`)
          .send(answer1)
          .expect(200);

        // User2 отвечает
        const answer2: SubmitAnswerInputDto = { answer: user2Answers[i] };
        await request(server)
          .post('/pair-game-quiz/pairs/my-current/answers')
          .set('Authorization', `Bearer ${user2Token}`)
          .send(answer2)
          .expect(200);
      }

      // Проверяем финальное состояние игры через gameId
      // Игра завершается автоматически когда оба игрока ответили на все 5 вопросов
      const finalGameResponse = await request(server)
        .get(`/pair-game-quiz/pairs/${gameId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const finalGame: PairGameViewDto = finalGameResponse.body;

      // Проверяем, что оба игрока ответили на все вопросы
      expect(finalGame.firstPlayerProgress.answers).toHaveLength(5);
      expect(finalGame.secondPlayerProgress!.answers).toHaveLength(5);

      // Игра должна быть завершена (оба игрока ответили на все 5 вопросов)
      expect(finalGame.status).toBe('Finished');
      expect(finalGame.finishGameDate).not.toBeNull();

      // User1: 4 правильных ответа (1, 2, 4, 5) + 1 бонус (закончил быстрее) = 5 очков
      expect(finalGame.firstPlayerProgress.score).toBe(5);
      // User2: 3 правильных ответа (2, 3, 5) = 3 очка
      expect(finalGame.secondPlayerProgress!.score).toBe(3);
    });

    it('Step 6: should return 404 when no active game exists after completion', async () => {
      // После завершения игры не должно быть активной игры
      await request(server)
        .get('/pair-game-quiz/pairs/my-current')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);

      await request(server)
        .get('/pair-game-quiz/pairs/my-current')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);
    });

    it('Step 7: should return 403 when trying to submit answer without active game', async () => {
      const answer: SubmitAnswerInputDto = {
        answer: 'some answer',
      };

      await request(server)
        .post('/pair-game-quiz/pairs/my-current/answers')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(answer)
        .expect(403);
    });

    it('Step 8: should return 403 when trying to get game by non-participant', async () => {
      // Создаем третьего пользователя
      const user3Data: CreateUserInputDto = {
        login: 'player3',
        password: 'password123',
        email: 'player3@test.com',
      };

      const user3Response = await request(server)
        .post('/sa/users')
        .set('Authorization', basicAuth)
        .send(user3Data)
        .expect(201);

      const login3Response = await request(server)
        .post('/auth/login')
        .send({
          loginOrEmail: user3Data.login,
          password: user3Data.password,
        })
        .expect(200);

      const user3Token = login3Response.body.accessToken;

      // User3 пытается получить игру, в которой не участвует
      await request(server)
        .get(`/pair-game-quiz/pairs/${gameId}`)
        .set('Authorization', `Bearer ${user3Token}`)
        .expect(403);
    });
  });
});
