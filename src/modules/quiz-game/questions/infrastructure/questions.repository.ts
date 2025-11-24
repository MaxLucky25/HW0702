import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Question } from '../domain/entities/question.entity';
import { CreateQuestionDomainDto } from '../domain/dto/create-question.domain.dto';
import { UpdateQuestionDomainDto } from '../domain/dto/update-question.domain.dto';
import {
  FindQuestionByIdDto,
  FindRandomQuestionsDto,
} from './dto/questions-repo.dto';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

@Injectable()
export class QuestionsRepository {
  constructor(
    @InjectRepository(Question)
    private readonly repository: Repository<Question>,
  ) {}

  async findById(dto: FindQuestionByIdDto): Promise<Question | null> {
    return await this.repository.findOne({
      where: { id: dto.id },
    });
  }

  async findByIdOrNotFoundFail(dto: FindQuestionByIdDto): Promise<Question> {
    const question = await this.findById(dto);

    if (!question) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Question not found!',
        field: 'Question',
      });
    }

    return question;
  }

  /**
   * Получить случайные опубликованные вопросы (без EntityManager)
   *
   * @usedIn - используется в других модулях для получения вопросов вне транзакций
   */
  async findRandomQuestions(dto: FindRandomQuestionsDto): Promise<Question[]> {
    return await this.repository
      .createQueryBuilder('question')
      .where('question.published = :published', { published: true })
      .orderBy('RANDOM()')
      .limit(dto.count)
      .getMany();
  }

  async createQuestion(dto: CreateQuestionDomainDto): Promise<Question> {
    const question = Question.create(dto);
    return await this.repository.save(question);
  }

  async updateQuestion(
    entity: Question,
    dto: UpdateQuestionDomainDto,
  ): Promise<Question> {
    entity.update(dto);
    return await this.repository.save(entity);
  }

  async publishQuestion(entity: Question): Promise<Question> {
    entity.publish();
    return await this.repository.save(entity);
  }

  async unpublishQuestion(entity: Question): Promise<Question> {
    entity.unpublish();
    return await this.repository.save(entity);
  }

  async deleteQuestion(entity: Question): Promise<void> {
    await this.repository.remove(entity);
  }

  // ==================== MATCHMAKING METHODS ====================

  /**
   * Получает случайные опубликованные вопросы для игры (с EntityManager)
   * Выбрасывает исключение, если недостаточно вопросов
   *
   * @usedIn MatchmakingService.connectUserToGame - получение вопросов для старта игры
   */
  async getRandomPublishedQuestions(
    count: number,
    manager: EntityManager,
  ): Promise<Question[]> {
    const questions = await manager
      .createQueryBuilder(Question, 'question')
      .where('question.published = :published', { published: true })
      .orderBy('RANDOM()')
      .limit(count)
      .getMany();

    if (questions.length < count) {
      throw new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: 'Not enough published questions available',
        field: 'Questions',
      });
    }

    return questions;
  }
}
