import {
  BaseQueryParams,
  SortDirection,
} from '../../../../../core/dto/base.query-params.input-dto';
import { IsEnum, IsOptional } from 'class-validator';

export enum GamesSortBy {
  Status = 'status',
  PairCreatedDate = 'pairCreatedDate',
}

export class GetMyGamesQueryParams extends BaseQueryParams {
  @IsEnum(GamesSortBy)
  @IsOptional()
  sortBy = GamesSortBy.Status;

  @IsEnum(SortDirection)
  @IsOptional()
  sortDirection = SortDirection.Asc;
}
