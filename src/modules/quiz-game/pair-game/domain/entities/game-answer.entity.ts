import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { GameQuestion } from './game-question.entity';
import { Player } from './player.entity';
import { CreateGameAnswerDomainDto } from '../dto/create-game-answer.domain.dto';

@Entity('game_answers')
@Index(['gameQuestionId', 'playerId'], { unique: true }) // один ответ игрока на конкретный вопрос
export class GameAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => GameQuestion, (gameQuestion) => gameQuestion.answers, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'game_question_id' })
  gameQuestion: GameQuestion;

  @Column({ name: 'game_question_id', type: 'uuid' })
  gameQuestionId: string;

  @ManyToOne(() => Player, (player) => player.answers, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({ name: 'is_correct' })
  isCorrect: boolean;

  @CreateDateColumn({
    name: 'added_at',
    type: 'timestamp',
  })
  addedAt: Date;

  /**
   * Статический метод для создания ответа игрока
   */
  static create(dto: CreateGameAnswerDomainDto): GameAnswer {
    const gameAnswer = new GameAnswer();
    gameAnswer.gameQuestionId = dto.gameQuestionId;
    gameAnswer.playerId = dto.playerId;
    gameAnswer.answer = dto.answer;
    gameAnswer.isCorrect = dto.isCorrect;
    // addedAt установится автоматически через @CreateDateColumn

    return gameAnswer;
  }
}
