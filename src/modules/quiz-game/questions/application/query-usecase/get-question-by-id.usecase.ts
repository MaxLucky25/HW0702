import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { QuestionsQueryRepository } from '../../infrastructure/query/questions.query-repository';
import { QuestionViewDto } from '../../api/view-dto/question.view-dto';

export class GetQuestionByIdQuery {
  constructor(public readonly id: string) {}
}

@QueryHandler(GetQuestionByIdQuery)
export class GetQuestionByIdUseCase
  implements IQueryHandler<GetQuestionByIdQuery, QuestionViewDto>
{
  constructor(private questionsQueryRepository: QuestionsQueryRepository) {}

  async execute(query: GetQuestionByIdQuery): Promise<QuestionViewDto> {
    return this.questionsQueryRepository.getByIdOrNotFoundFail({
      id: query.id,
    });
  }
}
