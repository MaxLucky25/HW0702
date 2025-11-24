import { Module } from '@nestjs/common';
import { TestingController } from './testing.controller';
import { TestingService } from './testing.service';

@Module({
  imports: [],
  controllers: [TestingController],
  providers: [TestingService],
})
export class TestingModule {}
