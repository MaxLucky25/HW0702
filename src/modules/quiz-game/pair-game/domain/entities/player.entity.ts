import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { PairGame } from './pair-game.entity';
import { User } from '../../../../auth-manage/user-accounts/domain/entities/user.entity';
import { GameAnswer } from './game-answer.entity';
import { PlayerRole } from '../dto/player-role.enum';
import { CreatePlayerDomainDto } from '../dto/create-player.domain.dto';
import { GAME_CONSTANTS } from '../dto/game.constants';

@Entity('players')
@Index(['gameId', 'userId'], { unique: true }) // один пользователь не может участвовать дважды в одной игре
@Index(['gameId', 'role'], { unique: true }) // в игре не более одного firstPlayer и одного secondPlayer
export class Player {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PairGame, (game) => game.players, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'game_id' })
  game: PairGame;

  @Column({ name: 'game_id', type: 'uuid' })
  gameId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: PlayerRole,
  })
  role: PlayerRole;

  @Column({ default: 0 })
  score: number;

  @Column({ default: 0 })
  bonus: number;

  @Column({ name: 'finished_at', type: 'timestamp', nullable: true })
  finishedAt: Date | null;

  @OneToMany(() => GameAnswer, (answer) => answer.player)
  answers: GameAnswer[];

  /**
   * Статический метод для создания нового игрока
   */
  static create(dto: CreatePlayerDomainDto): Player {
    const player = new Player();
    player.gameId = dto.gameId;
    player.userId = dto.userId;
    player.role = dto.role;
    player.finishedAt = null;
    // Явная инициализация для избежания NaN
    player.score = 0;
    player.bonus = 0;

    return player;
  }

  /**
   * Увеличить счет на 1 (за правильный ответ)
   */
  incrementScore(): void {
    this.score += 1;
  }

  /**
   * Завершить игру (устанавливает текущее время)
   */
  finish(): void {
    this.finishedAt = new Date();
  }

  /**
   * Начислить бонус за быстрейшее завершение игры
   */
  awardBonus(): void {
    this.bonus = GAME_CONSTANTS.BONUS_FOR_FASTEST_PLAYER;
  }

  /**
   * Проверить, закончил ли игрок все ответы
   */
  hasFinished(): boolean {
    return this.finishedAt !== null;
  }

  /**
   * Проверить, является ли игрок первым
   */
  isFirstPlayer(): boolean {
    return this.role === PlayerRole.FIRST_PLAYER;
  }

  /**
   * Проверить, является ли игрок вторым
   */
  isSecondPlayer(): boolean {
    return this.role === PlayerRole.SECOND_PLAYER;
  }
}
