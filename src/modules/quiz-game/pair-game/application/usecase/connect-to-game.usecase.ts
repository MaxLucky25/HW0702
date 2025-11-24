import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PairGameRepository } from '../../infrastructure/pair-game.repository';
import { MatchmakingService } from '../../domain/services/matchmaking.service';
import { PairGameViewDto } from '../../api/view-dto/pair-game.view-dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';

export class ConnectToGameCommand {
  constructor(public readonly userId: string) {}
}

@CommandHandler(ConnectToGameCommand)
export class ConnectToGameUseCase
  implements ICommandHandler<ConnectToGameCommand, PairGameViewDto>
{
  constructor(
    private matchmakingService: MatchmakingService,
    private pairGameRepository: PairGameRepository,
  ) {}

  async execute(command: ConnectToGameCommand): Promise<PairGameViewDto> {
    // Вся логика матчмейкинга выполняется в сервисе
    await this.matchmakingService.connectUserToGame(command.userId);

    // Загружаем полные данные игры для ответа (после коммита транзакции)
    const fullGame =
      await this.pairGameRepository.getCurrentGameByUserIdWithRelations({
        userId: command.userId,
      });

    if (!fullGame) {
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'Failed to load game after connection',
        field: 'Game',
      });
    }

    return PairGameViewDto.mapToView(fullGame);
  }
}
