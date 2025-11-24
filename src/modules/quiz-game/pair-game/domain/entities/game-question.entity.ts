import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { PairGame } from './pair-game.entity';
import { Question } from '../../../questions/domain/entities/question.entity';
import { GameAnswer } from './game-answer.entity';
import { CreateGameQuestionDomainDto } from '../dto/create-game-question.domain.dto';
import { GAME_CONSTANTS } from '../dto/game.constants';

@Entity('game_questions')
@Index(['gameId', 'order'], { unique: true }) // порядок уникален в рамках игры
export class GameQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PairGame, (game) => game.questions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'game_id' })
  game: PairGame;

  @Column({ name: 'game_id' })
  gameId: string;

  @ManyToOne(() => Question, { nullable: false })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @Column({ name: 'question_id' })
  questionId: string;

  @Column({ type: 'int' })
  order: number;

  @OneToMany(() => GameAnswer, (answer) => answer.gameQuestion)
  answers: GameAnswer[];

  /**
   * Статический метод для создания вопроса в игре
   */
  static create(dto: CreateGameQuestionDomainDto): GameQuestion {
    const gameQuestion = new GameQuestion();
    gameQuestion.gameId = dto.gameId;
    gameQuestion.questionId = dto.questionId;
    gameQuestion.order = dto.order;

    return gameQuestion;
  }

  /**
   * Проверить, является ли это последним вопросом
   */
  isLast(): boolean {
    return this.order === GAME_CONSTANTS.QUESTIONS_PER_GAME - 1;
  }
}
