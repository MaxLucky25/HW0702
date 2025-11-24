import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PairGameQueryRepository } from '../../infrastructure/query/pair-game.query-repository';
import { PairGameViewDto } from '../../api/view-dto/pair-game.view-dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';

export class GetCurrentGameQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetCurrentGameQuery)
export class GetCurrentGameUseCase
  implements IQueryHandler<GetCurrentGameQuery, PairGameViewDto>
{
  constructor(private pairGameQueryRepository: PairGameQueryRepository) {}

  async execute(query: GetCurrentGameQuery): Promise<PairGameViewDto> {
    const game = await this.pairGameQueryRepository.getCurrentGameByUserId({
      userId: query.userId,
    });

    if (!game) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'No active pair for current user',
        field: 'Game',
      });
    }

    const firstPlayer = game.getFirstPlayer();

    if (!firstPlayer) {
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'First player not found in game',
        field: 'Game',
      });
    }

    return PairGameViewDto.mapToView(game);
  }
}
