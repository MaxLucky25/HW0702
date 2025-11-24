import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Question } from '../../domain/entities/question.entity';
import { QuestionViewDto } from '../../api/view-dto/question.view-dto';
import { FindQuestionByIdDto } from '../dto/questions-repo.dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { GetQuestionsQueryParams } from '../../api/input-dto/get-questions-query-params.input-dto';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';
import { PublishedStatuses } from '../../api/input-dto/published-statuses.enum';

@Injectable()
export class QuestionsQueryRepository {
  constructor(
    @InjectRepository(Question)
    private readonly repository: Repository<Question>,
  ) {}

  async getByIdOrNotFoundFail(
    dto: FindQuestionByIdDto,
  ): Promise<QuestionViewDto> {
    const question = await this.repository.findOne({
      where: { id: dto.id },
    });

    if (!question) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Question not found!',
        field: 'Question',
      });
    }

    return QuestionViewDto.mapToView(question);
  }

  async getAll(
    query: GetQuestionsQueryParams,
  ): Promise<PaginatedViewDto<QuestionViewDto[]>> {
    const queryBuilder = this.repository.createQueryBuilder('question');

    this.applyPublishedStatusFilter(queryBuilder, query.publishedStatus);
    this.applyBodySearchFilter(queryBuilder, query.bodySearchTerm);
    this.applySorting(queryBuilder, query.sortBy, query.sortDirection);
    this.applyPagination(queryBuilder, query.pageSize, query.calculateSkip());

    const [questions, totalCount] = await queryBuilder.getManyAndCount();

    const items = questions.map((question) =>
      QuestionViewDto.mapToView(question),
    );

    return PaginatedViewDto.mapToView({
      items,
      totalCount,
      page: query.pageNumber,
      size: query.pageSize,
    });
  }

  /**
   * Применяет фильтр по статусу публикации
   */
  private applyPublishedStatusFilter(
    queryBuilder: SelectQueryBuilder<Question>,
    publishedStatus: PublishedStatuses,
  ): void {
    if (publishedStatus !== PublishedStatuses.ALL) {
      queryBuilder.andWhere('question.published = :published', {
        published: publishedStatus === PublishedStatuses.PUBLISHED,
      });
    }
  }

  /**
   * Применяет фильтр по поисковому термину в теле вопроса
   */
  private applyBodySearchFilter(
    queryBuilder: SelectQueryBuilder<Question>,
    bodySearchTerm: string | null,
  ): void {
    if (bodySearchTerm) {
      queryBuilder.andWhere('question.body ILIKE :bodySearchTerm', {
        bodySearchTerm: `%${bodySearchTerm}%`,
      });
    }
  }

  /**
   * Применяет сортировку
   */
  private applySorting(
    queryBuilder: SelectQueryBuilder<Question>,
    sortBy: string,
    sortDirection: string,
  ): void {
    const direction = sortDirection.toUpperCase() as 'ASC' | 'DESC';
    queryBuilder.orderBy(`question.${sortBy}`, direction);
  }

  /**
   * Применяет пагинацию
   */
  private applyPagination(
    queryBuilder: SelectQueryBuilder<Question>,
    limit: number,
    offset: number,
  ): void {
    queryBuilder.limit(limit).offset(offset);
  }
}
