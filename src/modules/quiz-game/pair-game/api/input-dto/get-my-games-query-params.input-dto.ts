import {
  BaseQueryParams,
  SortDirection,
} from '../../../../../core/dto/base.query-params.input-dto';
import { IsEnum, IsOptional } from 'class-validator';

export class GetMyGamesQueryParams extends BaseQueryParams {
  @IsEnum(SortDirection)
  @IsOptional()
  sortDirection = SortDirection.Desc;
}
