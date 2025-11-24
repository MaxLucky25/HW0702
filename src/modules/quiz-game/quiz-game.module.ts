import { Module } from '@nestjs/common';
import { QuestionsModule } from './questions/questions.module';
import { PairGameModule } from './pair-game/pair-game.module';

@Module({
  imports: [QuestionsModule, PairGameModule],
  exports: [QuestionsModule, PairGameModule],
})
export class QuizGameModule {}
