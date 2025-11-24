import { UserContextDto } from '../../../guards/dto/user-context.dto';
import { MeViewDto } from '../../../user-accounts/api/view-dto/users.view-dto';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UsersRepository } from '../../../user-accounts/infrastructure/user.repository';

export class AuthMeQuery {
  constructor(public readonly dto: UserContextDto) {}
}

@QueryHandler(AuthMeQuery)
export class AuthMeQueryUseCase
  implements IQueryHandler<AuthMeQuery, MeViewDto>
{
  constructor(private usersRepository: UsersRepository) {}

  async execute(command: AuthMeQuery): Promise<MeViewDto> {
    const user = await this.usersRepository.findOrNotFoundFail(command.dto);
    return MeViewDto.mapToView(user);
  }
}
