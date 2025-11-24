import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import { BasicAuthGuard } from '../../../auth-manage/guards/basic/basic-auth.guard';
import { GetQuestionsQueryParams } from './input-dto/get-questions-query-params.input-dto';
import { QuestionInputDto } from './input-dto/question.input.dto';
import { PublishQuestionInputDto } from './input-dto/publish-question.input.dto';
import { PaginatedViewDto } from '../../../../core/dto/base.paginated.view-dto';
import { QuestionViewDto } from './view-dto/question.view-dto';
import { GetAllQuestionsQuery } from '../application/query-usecase/get-all-questions.usecase';
import { GetQuestionByIdQuery } from '../application/query-usecase/get-question-by-id.usecase';
import { CreateQuestionCommand } from '../application/usecase/create-question.usecase';
import { UpdateQuestionCommand } from '../application/usecase/update-question.usecase';
import { DeleteQuestionCommand } from '../application/usecase/delete-question.usecase';
import { PublishQuestionCommand } from '../application/usecase/publish-question.usecase';

@UseGuards(BasicAuthGuard)
@Controller('sa/quiz/questions')
export class QuestionsController {
  constructor(
    private queryBus: QueryBus,
    private commandBus: CommandBus,
  ) {}

  @Get()
  async getAll(
    @Req() req: any,
    @Query() query: GetQuestionsQueryParams,
  ): Promise<PaginatedViewDto<QuestionViewDto[]>> {
    return this.queryBus.execute(new GetAllQuestionsQuery(query));
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<QuestionViewDto> {
    return this.queryBus.execute(new GetQuestionByIdQuery(id));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: QuestionInputDto): Promise<QuestionViewDto> {
    return this.commandBus.execute(new CreateQuestionCommand(body));
  }

  @Put(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @Param('id') id: string,
    @Body() body: QuestionInputDto,
  ): Promise<void> {
    return this.commandBus.execute(new UpdateQuestionCommand(id, body));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    return this.commandBus.execute(new DeleteQuestionCommand(id));
  }

  @Put(':id/publish')
  @HttpCode(HttpStatus.NO_CONTENT)
  async publish(
    @Param('id') id: string,
    @Body() body: PublishQuestionInputDto,
  ): Promise<void> {
    return this.commandBus.execute(new PublishQuestionCommand(id, body));
  }
}
