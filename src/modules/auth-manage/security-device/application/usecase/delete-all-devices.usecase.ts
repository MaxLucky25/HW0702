import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SecurityDeviceRepository } from '../../infrastructure/security-device.repository';
import { RevokeAllUserSessionsExceptCurrentDto } from '../../infrastructure/dto/session-repo.dto';

export class DeleteAllDevicesCommand {
  constructor(
    public readonly userId: string,
    public readonly currentDeviceId: string,
  ) {}
}

@CommandHandler(DeleteAllDevicesCommand)
export class DeleteAllDevicesUseCase
  implements ICommandHandler<DeleteAllDevicesCommand, void>
{
  constructor(private securityDeviceRepository: SecurityDeviceRepository) {}

  async execute(command: DeleteAllDevicesCommand): Promise<void> {
    const { userId, currentDeviceId } = command;

    // Отзываем все сессии пользователя кроме текущей
    const revokeDto: RevokeAllUserSessionsExceptCurrentDto = {
      userId,
      currentDeviceId,
    };

    await this.securityDeviceRepository.revokeAllUserSessionsExceptCurrent(
      revokeDto,
    );
  }
}
