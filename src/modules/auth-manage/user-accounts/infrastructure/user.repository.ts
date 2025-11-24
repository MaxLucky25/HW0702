import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from '../domain/entities/user.entity';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';
import { CreateUserDomainDto } from '../domain/dto/create-user.domain.dto';
import { UpdateUserInputDto } from '../api/input-dto/update-user.input.dto';
import {
  FindByEmailDto,
  FindByIdDto,
  FindByLoginOrEmailDto,
} from './dto/repoDto';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findById(dto: FindByIdDto): Promise<User | null> {
    return await this.repository.findOne({
      where: { id: dto.id, deletedAt: IsNull() },
    });
  }

  async findOrNotFoundFail(dto: FindByIdDto): Promise<User> {
    const user = await this.findById(dto);

    if (!user) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'User not found!',
        field: 'User',
      });
    }

    return user;
  }

  async findByEmail(dto: FindByEmailDto): Promise<User | null> {
    return await this.repository.findOne({
      where: { email: dto.email, deletedAt: IsNull() },
    });
  }

  async findByLoginOrEmail(dto: FindByLoginOrEmailDto): Promise<User | null> {
    return await this.repository.findOne({
      where: [
        { login: dto.loginOrEmail, deletedAt: IsNull() },
        { email: dto.loginOrEmail, deletedAt: IsNull() },
      ],
    });
  }

  async createUser(dto: CreateUserDomainDto): Promise<User> {
    // Используем статический метод Entity для создания
    const user = User.create(dto);

    return await this.repository.save(user);
  }

  async updateUser(entity: User, dto: UpdateUserInputDto): Promise<User> {
    entity.updateLoginAndEmail(dto.login, dto.email);
    return await this.repository.save(entity);
  }

  async deleteUser(entity: User): Promise<User> {
    entity.softDelete();
    return await this.repository.save(entity);
  }

  async updateUserPassword(entity: User, passwordHash: string): Promise<User> {
    entity.updatePassword(passwordHash);
    return await this.repository.save(entity);
  }

  async updateUserEmailConfirmed(entity: User): Promise<User> {
    entity.confirmEmail();
    return await this.repository.save(entity);
  }
}
