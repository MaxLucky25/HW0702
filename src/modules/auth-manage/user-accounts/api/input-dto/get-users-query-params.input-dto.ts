import {
  BaseQueryParams,
  SortDirection,
} from '../../../../../core/dto/base.query-params.input-dto';
import { UsersSortBy } from './user-sort-by';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class GetUsersQueryParams extends BaseQueryParams {
  @IsEnum(UsersSortBy)
  sortBy = UsersSortBy.CreatedAt;
  sortDirection = SortDirection.Desc;
  @IsString()
  @IsOptional()
  searchLoginTerm: string | null = null;
  @IsString()
  @IsOptional()
  searchEmailTerm: string | null = null;
}
