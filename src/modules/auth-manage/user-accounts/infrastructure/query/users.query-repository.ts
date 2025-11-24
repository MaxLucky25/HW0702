import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from '../../domain/entities/user.entity';
import { UserViewDto } from '../../api/view-dto/users.view-dto';
import { GetUsersQueryParams } from '../../api/input-dto/get-users-query-params.input-dto';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { FindByIdDto } from '../dto/repoDto';

@Injectable()
export class UsersQueryRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async getByIdOrNotFoundFail(dto: FindByIdDto): Promise<UserViewDto> {
    const user = await this.repository.findOne({
      where: { id: dto.id, deletedAt: IsNull() },
    });

    if (!user) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'User not found!',
        field: 'User',
      });
    }

    return UserViewDto.mapToView(user);
  }

  async getAll(
    query: GetUsersQueryParams,
  ): Promise<PaginatedViewDto<UserViewDto[]>> {
    const searchLoginTerm = query.searchLoginTerm;
    const searchEmailTerm = query.searchEmailTerm;

    // Создаем QueryBuilder
    const queryBuilder = this.repository.createQueryBuilder('user');

    // Базовое условие: только не удаленные пользователи
    queryBuilder.where({ deletedAt: IsNull() });

    // Если есть оба поисковых термина, используем OR
    if (searchLoginTerm && searchEmailTerm) {
      queryBuilder.andWhere(
        '(user.login ILIKE :loginTerm OR user.email ILIKE :emailTerm)',
        {
          loginTerm: `%${searchLoginTerm}%`,
          emailTerm: `%${searchEmailTerm}%`,
        },
      );
    } else if (searchLoginTerm) {
      queryBuilder.andWhere('user.login ILIKE :loginTerm', {
        loginTerm: `%${searchLoginTerm}%`,
      });
    } else if (searchEmailTerm) {
      queryBuilder.andWhere('user.email ILIKE :emailTerm', {
        emailTerm: `%${searchEmailTerm}%`,
      });
    }

    // Применяем сортировку (camelCase уже в UsersSortBy)
    const orderBy = query.sortBy;
    const direction = query.sortDirection.toUpperCase() as 'ASC' | 'DESC';
    queryBuilder.orderBy(`user.${orderBy}`, direction);

    // Применяем пагинацию
    const limit = query.pageSize;
    const offset = query.calculateSkip();
    queryBuilder.limit(limit).offset(offset);

    // Получаем данные и общее количество
    const [users, totalCount] = await queryBuilder.getManyAndCount();

    const items = users.map((user) => UserViewDto.mapToView(user));

    return PaginatedViewDto.mapToView({
      items,
      totalCount,
      page: query.pageNumber,
      size: query.pageSize,
    });
  }
}
