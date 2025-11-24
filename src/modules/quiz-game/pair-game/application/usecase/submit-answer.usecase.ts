import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SubmitAnswerInputDto } from '../../api/input-dto/submit-answer.input.dto';
import { AnswerViewDto } from '../../api/view-dto/answer.view-dto';
import { AnswerSubmissionService } from '../../domain/services/answer-submission.service';

export class SubmitAnswerCommand {
  constructor(
    public readonly userId: string,
    public readonly dto: SubmitAnswerInputDto,
  ) {}
}

@CommandHandler(SubmitAnswerCommand)
export class SubmitAnswerUseCase
  implements ICommandHandler<SubmitAnswerCommand, AnswerViewDto>
{
  constructor(private answerSubmissionService: AnswerSubmissionService) {}

  async execute(command: SubmitAnswerCommand): Promise<AnswerViewDto> {
    const answer = await this.answerSubmissionService.submitAnswer(
      command.userId,
      command.dto.answer,
    );

    return AnswerViewDto.mapToView(answer);
  }
}
