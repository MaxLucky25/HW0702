import { configModule } from './configs/dynamic-config-module';
import { Module } from '@nestjs/common';
import { TestingModule } from './modules/testing/testing.module';
import { AuthManageModule } from './modules/auth-manage/auth-manage.module';
import { ThrottlerConfigModule } from './configs/throttle-config.module';
import { CoreModule } from './core/core.module';
import { QuizGameModule } from './modules/quiz-game/quiz-game.module';

@Module({
  imports: [
    configModule,
    CoreModule,
    ThrottlerConfigModule,
    AuthManageModule,
    TestingModule,
    QuizGameModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
