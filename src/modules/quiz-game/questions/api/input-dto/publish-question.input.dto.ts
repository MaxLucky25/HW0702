import { IsBoolean } from 'class-validator';

export class PublishQuestionInputDto {
  @IsBoolean()
  published: boolean;
}
