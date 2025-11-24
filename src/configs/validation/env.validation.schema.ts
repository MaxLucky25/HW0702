import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Max,
  Matches,
  IsNotEmpty,
} from 'class-validator';

export class EnvironmentVariables {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT: number;

  @Matches(/^postgresql:\/\/.+$/)
  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  JWT_EXPIRES_IN: number;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  JWT_REFRESH_EXPIRES_IN: number;

  @IsString()
  @IsNotEmpty()
  EMAIL_USER: string;

  @IsString()
  @IsNotEmpty()
  EMAIL_PASS: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  EMAIL_CONFIRMATION_EXPIRATION?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  PASSWORD_RECOVERY_EXPIRATION?: number;

  @IsOptional()
  @IsNumber()
  @Min(100)
  THROTTLE_TTL: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  THROTTLE_LIMIT: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  BCRYPT_SALT_ROUNDS?: number;

  @IsOptional()
  @IsString()
  NODE_ENV: string;

  @IsString()
  @IsNotEmpty()
  ADMIN_LOGIN: string;

  @IsString()
  @IsNotEmpty()
  ADMIN_PASSWORD: string;
}
