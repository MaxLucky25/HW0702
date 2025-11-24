export class CreateSessionDomainDto {
  token: string;
  userId: string;
  deviceId: string;
  ip: string;
  userAgent: string;
  expiresIn: number;
}
