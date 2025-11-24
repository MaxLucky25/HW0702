import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { QuestionsRepository } from '../../infrastructure/questions.repository';
import { QuestionInputDto } from '../../api/input-dto/question.input.dto';
import { UpdateQuestionDomainDto } from '../../domain/dto/update-question.domain.dto';

export class UpdateQuestionCommand {
  constructor(
    public readonly id: string,
    public readonly dto: QuestionInputDto,
  ) {}
}

@CommandHandler(UpdateQuestionCommand)
export class UpdateQuestionUseCase
  implements ICommandHandler<UpdateQuestionCommand, void>
{
  constructor(private questionsRepository: QuestionsRepository) {}

  async execute(command: UpdateQuestionCommand): Promise<void> {
    const question = await this.questionsRepository.findByIdOrNotFoundFail({
      id: command.id,
    });

    const domainDto: UpdateQuestionDomainDto = {
      body: command.dto.body,
      correctAnswers: command.dto.correctAnswers,
    };

    await this.questionsRepository.updateQuestion(question, domainDto);
  }
}
