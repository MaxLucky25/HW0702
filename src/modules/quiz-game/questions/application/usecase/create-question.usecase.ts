import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { QuestionsRepository } from '../../infrastructure/questions.repository';
import { QuestionInputDto } from '../../api/input-dto/question.input.dto';
import { QuestionViewDto } from '../../api/view-dto/question.view-dto';
import { CreateQuestionDomainDto } from '../../domain/dto/create-question.domain.dto';

export class CreateQuestionCommand {
  constructor(public readonly dto: QuestionInputDto) {}
}

@CommandHandler(CreateQuestionCommand)
export class CreateQuestionUseCase
  implements ICommandHandler<CreateQuestionCommand, QuestionViewDto>
{
  constructor(private questionsRepository: QuestionsRepository) {}

  async execute(command: CreateQuestionCommand): Promise<QuestionViewDto> {
    const domainDto: CreateQuestionDomainDto = {
      body: command.dto.body,
      correctAnswers: command.dto.correctAnswers,
    };

    const question = await this.questionsRepository.createQuestion(domainDto);

    return QuestionViewDto.mapToView(question);
  }
}
