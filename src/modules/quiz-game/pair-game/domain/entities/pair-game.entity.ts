import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Player } from './player.entity';
import { GameQuestion } from './game-question.entity';
import { GameStatus } from '../dto/game-status.enum';
import { PlayerRole } from '../dto/player-role.enum';

@Entity('pair_games')
@Index(['status', 'createdAt']) // для матчмейкинга (поиск ожидающих игр FIFO)
export class PairGame {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: GameStatus,
    default: GameStatus.PENDING_SECOND_PLAYER,
  })
  status: GameStatus;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
  })
  updatedAt: Date;

  @Column({ name: 'start_game_date', type: 'timestamp', nullable: true })
  startGameDate: Date | null;

  @Column({ name: 'finish_game_date', type: 'timestamp', nullable: true })
  finishGameDate: Date | null;

  @OneToMany(() => Player, (player) => player.game, { cascade: true })
  players: Player[];

  @OneToMany(() => GameQuestion, (gameQuestion) => gameQuestion.game, {
    cascade: true,
  })
  questions: GameQuestion[];

  /**
   * Статический метод для создания новой игры
   */
  static create(): PairGame {
    const game = new PairGame();
    game.startGameDate = null;
    game.finishGameDate = null;
    // status установится автоматически через @Column({ default: GameStatus.PENDING_SECOND_PLAYER })
    // createdAt и updatedAt установятся автоматически через @CreateDateColumn и @UpdateDateColumn

    return game;
  }

  /**
   * Начать игру (когда подключился второй игрок)
   */
  startGame(): void {
    this.status = GameStatus.ACTIVE;
    this.startGameDate = new Date();
    // updatedAt обновится автоматически через @UpdateDateColumn
  }

  /**
   * Завершить игру
   */
  finishGame(): void {
    this.status = GameStatus.FINISHED;
    this.finishGameDate = new Date();
    // updatedAt обновится автоматически через @UpdateDateColumn
  }

  /**
   * Получить первого игрока
   */
  getFirstPlayer(): Player | undefined {
    return this.players?.find((p) => p.role === PlayerRole.FIRST_PLAYER);
  }

  /**
   * Получить второго игрока
   */
  getSecondPlayer(): Player | undefined {
    return this.players?.find((p) => p.role === PlayerRole.SECOND_PLAYER);
  }

  /**
   * Проверить, находится ли игра в ожидании второго игрока
   */
  isPendingSecondPlayer(): boolean {
    return this.status === GameStatus.PENDING_SECOND_PLAYER;
  }

  /**
   * Проверить, активна ли игра
   */
  isActive(): boolean {
    return this.status === GameStatus.ACTIVE;
  }
}
