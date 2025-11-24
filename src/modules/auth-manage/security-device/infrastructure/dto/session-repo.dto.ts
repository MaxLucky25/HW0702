export class FindByUserAndDeviceDto {
  userId: string;
  deviceId: string;
}

export class FindByUserIdDto {
  userId: string;
}

export class RevokeAllUserSessionsExceptCurrentDto {
  userId: string;
  currentDeviceId: string;
}
