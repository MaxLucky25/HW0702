import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import { RefreshTokenAuthGuard } from '../../guards/bearer/refresh-token-auth.guard';
import { ExtractUserForRefreshTokenGuard } from '../../guards/decorators/param/extract-user-for-refresh-token-guard.decorator';
import { TokenContextDto } from '../../guards/dto/token-context.dto';
import { DeviceViewDto } from './view-dto/device.view-dto';
import { GetUserDevicesQuery } from '../application/query-usecase/get-user-devices.usecase';
import { DeleteDeviceCommand } from '../application/usecase/delete-device.usecase';
import { DeleteAllDevicesCommand } from '../application/usecase/delete-all-devices.usecase';
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@UseGuards(RefreshTokenAuthGuard)
@Controller('security')
export class SecurityController {
  constructor(
    private queryBus: QueryBus,
    private commandBus: CommandBus,
  ) {}

  @Get('devices')
  async getUserDevices(
    @ExtractUserForRefreshTokenGuard() user: TokenContextDto,
  ): Promise<DeviceViewDto[]> {
    return this.queryBus.execute(new GetUserDevicesQuery(user.userId));
  }

  @Delete('devices/:deviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDevice(
    @Param('deviceId') deviceId: string,
    @ExtractUserForRefreshTokenGuard() user: TokenContextDto,
  ): Promise<void> {
    return this.commandBus.execute(
      new DeleteDeviceCommand(user.userId, deviceId),
    );
  }

  @Delete('devices')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAllDevices(
    @ExtractUserForRefreshTokenGuard() user: TokenContextDto,
  ): Promise<void> {
    return this.commandBus.execute(
      new DeleteAllDevicesCommand(user.userId, user.deviceId),
    );
  }
}
