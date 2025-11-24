import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityDeviceRepository } from './infrastructure/security-device.repository';
import { Session } from './domain/session.entity';
import { SecurityController } from './api/security.controller';
import { GetUserDevicesQueryUseCase } from './application/query-usecase/get-user-devices.usecase';
import { DeleteDeviceUseCase } from './application/usecase/delete-device.usecase';
import { DeleteAllDevicesUseCase } from './application/usecase/delete-all-devices.usecase';
import { RefreshTokenAuthGuard } from '../guards/bearer/refresh-token-auth.guard';

const QueryHandlers = [GetUserDevicesQueryUseCase];
const CommandHandlers = [DeleteDeviceUseCase, DeleteAllDevicesUseCase];

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([Session])],
  controllers: [SecurityController],
  providers: [
    SecurityDeviceRepository,
    RefreshTokenAuthGuard,
    ...QueryHandlers,
    ...CommandHandlers,
  ],
  exports: [SecurityDeviceRepository],
})
export class SecurityDeviceModule {}
