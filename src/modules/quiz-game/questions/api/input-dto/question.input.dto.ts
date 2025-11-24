import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { IsStringWithTrim } from '../../../../../core/decorators/validation/is-string-with-trim';
import { questionConstraints } from './question-constraints';
import { TrimEach } from '../../../../../core/decorators/transform/trim-each';

export class QuestionInputDto {
  @IsStringWithTrim(
    questionConstraints.body.minLength,
    questionConstraints.body.maxLength,
  )
  body: string;

  @IsArray()
  @ArrayMinSize(questionConstraints.correctAnswers.minLength)
  @TrimEach()
  @IsString({ each: true })
  correctAnswers: string[];
}
