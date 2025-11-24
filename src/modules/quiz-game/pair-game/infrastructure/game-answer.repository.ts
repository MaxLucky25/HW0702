import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameAnswer } from '../domain/entities/game-answer.entity';

@Injectable()
export class GameAnswerRepository {
  constructor(
    @InjectRepository(GameAnswer)
    private readonly repository: Repository<GameAnswer>,
  ) {}
}
