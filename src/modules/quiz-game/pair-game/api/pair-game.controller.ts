import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../../auth-manage/guards/bearer/jwt-auth-guard';
import { ExtractUserForJwtGuard } from '../../../auth-manage/guards/decorators/param/extract-user-for-jwt-guard.decorator';
import { UserContextDto } from '../../../auth-manage/guards/dto/user-context.dto';
import { UuidValidationPipe } from '../../../../core/pipes/uuid-validator-transformation-pipe-service';
import { PairGameViewDto } from './view-dto/pair-game.view-dto';
import { SubmitAnswerInputDto } from './input-dto/submit-answer.input.dto';
import { AnswerViewDto } from './view-dto/answer.view-dto';
import { GetCurrentGameQuery } from '../application/query-usecase/get-current-game.usecase';
import { GetGameByIdQuery } from '../application/query-usecase/get-game-by-id.usecase';
import { GetMyGamesQuery } from '../application/query-usecase/get-my-games.usecase';
import { GetUserStatisticQuery } from '../application/query-usecase/get-user-statistic.usecase';
import { ConnectToGameCommand } from '../application/usecase/connect-to-game.usecase';
import { SubmitAnswerCommand } from '../application/usecase/submit-answer.usecase';
import { GetMyGamesQueryParams } from './input-dto/get-my-games-query-params.input-dto';
import { PaginatedViewDto } from '../../../../core/dto/base.paginated.view-dto';
import { UserStatisticViewDto } from './view-dto/user-statistic.view-dto';

@UseGuards(JwtAuthGuard)
@Controller('pair-game-quiz')
export class PairGameController {
  constructor(
    private queryBus: QueryBus,
    private commandBus: CommandBus,
  ) {}

  @Get('pairs/my-current')
  async getCurrentGame(
    @ExtractUserForJwtGuard() user: UserContextDto,
  ): Promise<PairGameViewDto> {
    return this.queryBus.execute(new GetCurrentGameQuery(user.id));
  }

  @Get('pairs/my')
  async getMyGames(
    @Query() queryParams: GetMyGamesQueryParams,
    @ExtractUserForJwtGuard() user: UserContextDto,
  ): Promise<PaginatedViewDto<PairGameViewDto[]>> {
    return this.queryBus.execute(new GetMyGamesQuery(user.id, queryParams));
  }

  @Get('pairs/:id')
  async getGameById(
    @Param('id', UuidValidationPipe) id: string,
    @ExtractUserForJwtGuard() user: UserContextDto,
  ): Promise<PairGameViewDto> {
    return this.queryBus.execute(new GetGameByIdQuery(id, user.id));
  }

  @Post('pairs/connection')
  @HttpCode(HttpStatus.OK)
  async connectToGame(
    @ExtractUserForJwtGuard() user: UserContextDto,
  ): Promise<PairGameViewDto> {
    return this.commandBus.execute(new ConnectToGameCommand(user.id));
  }

  @Post('pairs/my-current/answers')
  @HttpCode(HttpStatus.OK)
  async submitAnswer(
    @Body() body: SubmitAnswerInputDto,
    @ExtractUserForJwtGuard() user: UserContextDto,
  ): Promise<AnswerViewDto> {
    return this.commandBus.execute(new SubmitAnswerCommand(user.id, body));
  }

  @Get('users/my-statistic')
  async getMyStatistic(
    @ExtractUserForJwtGuard() user: UserContextDto,
  ): Promise<UserStatisticViewDto> {
    return this.queryBus.execute(new GetUserStatisticQuery(user.id));
  }
}
