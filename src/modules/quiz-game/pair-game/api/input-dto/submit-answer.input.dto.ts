import { IsStringWithTrim } from '../../../../../core/decorators/validation/is-string-with-trim';

export class SubmitAnswerInputDto {
  @IsStringWithTrim(1, 100)
  answer: string;
}
