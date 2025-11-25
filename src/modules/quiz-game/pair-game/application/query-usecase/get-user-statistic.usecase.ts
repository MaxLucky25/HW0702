import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserStatisticRepository } from '../../infrastructure/user-statistic.repository';
import { UserStatisticViewDto } from '../../api/view-dto/user-statistic.view-dto';

export class GetUserStatisticQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetUserStatisticQuery)
export class GetUserStatisticUseCase
  implements IQueryHandler<GetUserStatisticQuery, UserStatisticViewDto>
{
  constructor(private userStatisticRepository: UserStatisticRepository) {}

  async execute(query: GetUserStatisticQuery): Promise<UserStatisticViewDto> {
    // Repository сам решает - вернуть существующую статистику или создать пустую
    const statistic =
      await this.userStatisticRepository.getOrCreateEmptyStatistic(
        query.userId,
      );

    // Возвращаем данные из Entity (с дефолтными значениями или реальными)
    return UserStatisticViewDto.mapToView({
      sumScore: statistic.sumScore,
      avgScores: statistic.avgScores, // вычисляемое поле из Entity getter
      gamesCount: statistic.gamesCount,
      winsCount: statistic.winsCount,
      lossesCount: statistic.lossesCount,
      drawsCount: statistic.drawsCount,
    });
  }
}
