import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserViewDto } from '../../api/view-dto/users.view-dto';
import { UsersQueryRepository } from '../../infrastructure/query/users.query-repository';

export class GetUserByIdQuery {
  constructor(public readonly id: string) {}
}

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdUseCase
  implements IQueryHandler<GetUserByIdQuery, UserViewDto>
{
  constructor(private usersQueryRepository: UsersQueryRepository) {}

  async execute(query: GetUserByIdQuery): Promise<UserViewDto> {
    return this.usersQueryRepository.getByIdOrNotFoundFail({ id: query.id });
  }
}
