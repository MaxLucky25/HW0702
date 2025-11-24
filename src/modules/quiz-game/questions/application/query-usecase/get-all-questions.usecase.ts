import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { QuestionsQueryRepository } from '../../infrastructure/query/questions.query-repository';
import { GetQuestionsQueryParams } from '../../api/input-dto/get-questions-query-params.input-dto';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';
import { QuestionViewDto } from '../../api/view-dto/question.view-dto';

export class GetAllQuestionsQuery {
  constructor(public readonly query: GetQuestionsQueryParams) {}
}

@QueryHandler(GetAllQuestionsQuery)
export class GetAllQuestionsUseCase
  implements
    IQueryHandler<GetAllQuestionsQuery, PaginatedViewDto<QuestionViewDto[]>>
{
  constructor(private questionsQueryRepository: QuestionsQueryRepository) {}

  async execute(
    query: GetAllQuestionsQuery,
  ): Promise<PaginatedViewDto<QuestionViewDto[]>> {
    return this.questionsQueryRepository.getAll(query.query);
  }
}
