import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class UpdateUserInputDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  @MaxLength(10)
  login: string;
}
