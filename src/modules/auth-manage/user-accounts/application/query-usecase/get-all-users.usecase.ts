import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUsersQueryParams } from '../../api/input-dto/get-users-query-params.input-dto';
import { UserViewDto } from '../../api/view-dto/users.view-dto';
import { UsersQueryRepository } from '../../infrastructure/query/users.query-repository';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';

export class GetAllUsersQuery {
  constructor(public readonly queryParams: GetUsersQueryParams) {}
}

@QueryHandler(GetAllUsersQuery)
export class GetAllUsersQueryUseCase
  implements IQueryHandler<GetAllUsersQuery, PaginatedViewDto<UserViewDto[]>>
{
  constructor(private usersQueryRepository: UsersQueryRepository) {}

  async execute(
    query: GetAllUsersQuery,
  ): Promise<PaginatedViewDto<UserViewDto[]>> {
    return this.usersQueryRepository.getAll(query.queryParams);
  }
}
