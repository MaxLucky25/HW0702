import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PairGameQueryRepository } from '../../infrastructure/query/pair-game.query-repository';
import { PairGameViewDto } from '../../api/view-dto/pair-game.view-dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';

export class GetGameByIdQuery {
  constructor(
    public readonly gameId: string,
    public readonly userId: string,
  ) {}
}

@QueryHandler(GetGameByIdQuery)
export class GetGameByIdUseCase
  implements IQueryHandler<GetGameByIdQuery, PairGameViewDto>
{
  constructor(private pairGameQueryRepository: PairGameQueryRepository) {}

  async execute(query: GetGameByIdQuery): Promise<PairGameViewDto> {
    const game = await this.pairGameQueryRepository.getGameByIdForUser(
      query.gameId,
      query.userId,
    );

    if (!game) {
      throw new DomainException({
        code: DomainExceptionCode.Forbidden,
        message: 'Current user is not participant of this pair',
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
