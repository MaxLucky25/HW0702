import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SecurityDeviceRepository } from '../../infrastructure/security-device.repository';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';

export class DeleteDeviceCommand {
  constructor(
    public readonly userId: string,
    public readonly deviceId: string,
  ) {}
}

@CommandHandler(DeleteDeviceCommand)
export class DeleteDeviceUseCase
  implements ICommandHandler<DeleteDeviceCommand, void>
{
  constructor(private securityDeviceRepository: SecurityDeviceRepository) {}

  async execute(command: DeleteDeviceCommand): Promise<void> {
    const { userId, deviceId } = command;

    // 1. Сначала найти сессию по deviceId (независимо от пользователя)
    const session =
      await this.securityDeviceRepository.findByDeviceId(deviceId);

    if (!session) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Device not found',
        field: 'deviceId',
      });
    }

    // 2. Проверить права доступа - принадлежит ли сессия текущему пользователю
    if (session.userId !== userId) {
      throw new DomainException({
        code: DomainExceptionCode.Forbidden,
        message: 'Cannot delete device from another user',
        field: 'deviceId',
      });
    }

    // 3. Отзываем сессию через умную сущность
    await this.securityDeviceRepository.revokeSession(session);
  }
}
