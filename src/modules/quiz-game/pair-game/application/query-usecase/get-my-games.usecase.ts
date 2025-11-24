import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PairGameQueryRepository } from '../../infrastructure/query/pair-game.query-repository';
import { PairGameViewDto } from '../../api/view-dto/pair-game.view-dto';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';
import { GetMyGamesQueryParams } from '../../api/input-dto/get-my-games-query-params.input-dto';

export class GetMyGamesQuery {
  constructor(
    public readonly userId: string,
    public readonly queryParams: GetMyGamesQueryParams,
  ) {}
}

@QueryHandler(GetMyGamesQuery)
export class GetMyGamesUseCase
  implements IQueryHandler<GetMyGamesQuery, PaginatedViewDto<PairGameViewDto[]>>
{
  constructor(private pairGameQueryRepository: PairGameQueryRepository) {}

  async execute(
    query: GetMyGamesQuery,
  ): Promise<PaginatedViewDto<PairGameViewDto[]>> {
    const [games, totalCount] = await this.pairGameQueryRepository.getMyGames(
      query.userId,
      query.queryParams.pageSize,
      query.queryParams.calculateSkip(),
      query.queryParams.sortBy,
      query.queryParams.sortDirection,
    );

    const items = games.map((game) => PairGameViewDto.mapToView(game));

    return PaginatedViewDto.mapToView({
      items,
      totalCount,
      page: query.queryParams.pageNumber,
      size: query.queryParams.pageSize,
    });
  }
}
