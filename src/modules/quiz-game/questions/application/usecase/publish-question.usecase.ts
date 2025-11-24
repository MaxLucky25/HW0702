import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { QuestionsRepository } from '../../infrastructure/questions.repository';
import { PublishQuestionInputDto } from '../../api/input-dto/publish-question.input.dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';

export class PublishQuestionCommand {
  constructor(
    public readonly id: string,
    public readonly dto: PublishQuestionInputDto,
  ) {}
}

@CommandHandler(PublishQuestionCommand)
export class PublishQuestionUseCase
  implements ICommandHandler<PublishQuestionCommand, void>
{
  constructor(private questionsRepository: QuestionsRepository) {}

  async execute(command: PublishQuestionCommand): Promise<void> {
    const question = await this.questionsRepository.findByIdOrNotFoundFail({
      id: command.id,
    });

    // Проверяем, что у вопроса есть правильные ответы перед публикацией
    if (
      command.dto.published &&
      (!question.correctAnswers || question.correctAnswers.length === 0)
    ) {
      throw new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: 'Question must have correct answers to be published',
        field: 'correctAnswers',
      });
    }

    if (command.dto.published) {
      await this.questionsRepository.publishQuestion(question);
    } else {
      await this.questionsRepository.unpublishQuestion(question);
    }
  }
}
