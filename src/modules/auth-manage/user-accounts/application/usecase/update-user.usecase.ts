import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UsersRepository } from '../../infrastructure/user.repository';
import { UpdateUserInputDto } from '../../api/input-dto/update-user.input.dto';
import { FindByIdDto } from '../../infrastructure/dto/repoDto';

export class UpdateUserCommand {
  constructor(
    public readonly userId: FindByIdDto,
    public readonly dto: UpdateUserInputDto,
  ) {}
}

@CommandHandler(UpdateUserCommand)
export class UpdateUserUseCase
  implements ICommandHandler<UpdateUserCommand, void>
{
  constructor(private usersRepository: UsersRepository) {}

  async execute(command: UpdateUserCommand): Promise<void> {
    const user = await this.usersRepository.findOrNotFoundFail({
      id: command.userId.id,
    });

    await this.usersRepository.updateUser(user, command.dto);
  }
}
