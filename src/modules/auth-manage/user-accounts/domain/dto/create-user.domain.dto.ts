export class CreateUserDomainDto {
  login: string;
  email: string;
  passwordHash: string;
  emailConfirmationExpirationMinutes: number; // EmailConfirmation всегда создается каскадно при создании User
}
