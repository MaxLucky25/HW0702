import {
  Controller,
  Get,
  Post,
  Param,
  Body,
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
import { ConnectToGameCommand } from '../application/usecase/connect-to-game.usecase';
import { SubmitAnswerCommand } from '../application/usecase/submit-answer.usecase';

@UseGuards(JwtAuthGuard)
@Controller('pair-game-quiz/pairs')
export class PairGameController {
  constructor(
    private queryBus: QueryBus,
    private commandBus: CommandBus,
  ) {}

  @Get('my-current')
  async getCurrentGame(
    @ExtractUserForJwtGuard() user: UserContextDto,
  ): Promise<PairGameViewDto> {
    return this.queryBus.execute(new GetCurrentGameQuery(user.id));
  }

  @Get(':id')
  async getGameById(
    @Param('id', UuidValidationPipe) id: string,
    @ExtractUserForJwtGuard() user: UserContextDto,
  ): Promise<PairGameViewDto> {
    return this.queryBus.execute(new GetGameByIdQuery(id, user.id));
  }

  @Post('connection')
  @HttpCode(HttpStatus.OK)
  async connectToGame(
    @ExtractUserForJwtGuard() user: UserContextDto,
  ): Promise<PairGameViewDto> {
    return this.commandBus.execute(new ConnectToGameCommand(user.id));
  }

  @Post('my-current/answers')
  @HttpCode(HttpStatus.OK)
  async submitAnswer(
    @Body() body: SubmitAnswerInputDto,
    @ExtractUserForJwtGuard() user: UserContextDto,
  ): Promise<AnswerViewDto> {
    return this.commandBus.execute(new SubmitAnswerCommand(user.id, body));
  }
}
