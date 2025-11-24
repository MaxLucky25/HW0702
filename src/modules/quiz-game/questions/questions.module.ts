import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Question } from './domain/entities/question.entity';
import { QuestionsRepository } from './infrastructure/questions.repository';
import { QuestionsQueryRepository } from './infrastructure/query/questions.query-repository';
import { QuestionsController } from './api/questions.controller';
import { GetAllQuestionsUseCase } from './application/query-usecase/get-all-questions.usecase';
import { GetQuestionByIdUseCase } from './application/query-usecase/get-question-by-id.usecase';
import { CreateQuestionUseCase } from './application/usecase/create-question.usecase';
import { UpdateQuestionUseCase } from './application/usecase/update-question.usecase';
import { DeleteQuestionUseCase } from './application/usecase/delete-question.usecase';
import { PublishQuestionUseCase } from './application/usecase/publish-question.usecase';

const QueryHandlers = [GetAllQuestionsUseCase, GetQuestionByIdUseCase];

const CommandHandlers = [
  CreateQuestionUseCase,
  UpdateQuestionUseCase,
  DeleteQuestionUseCase,
  PublishQuestionUseCase,
];

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([Question])],
  controllers: [QuestionsController],
  providers: [
    ...QueryHandlers,
    ...CommandHandlers,
    QuestionsRepository,
    QuestionsQueryRepository,
  ],
  exports: [QuestionsRepository, QuestionsQueryRepository],
})
export class QuestionsModule {}
