import {
  Entity,
  Column,
  PrimaryColumn,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { randomUUID } from 'crypto';
import { add } from 'date-fns';

@Entity('password_recoveries')
export class PasswordRecovery {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'recovery_code' })
  recoveryCode: string;

  @Column({ name: 'expiration_date', type: 'timestamp' })
  expirationDate: Date;

  @Column({ name: 'is_confirmed', default: false })
  isConfirmed: boolean;

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

  /**
   * Статический метод для создания recovery кода с автогенерацией
   */
  static create(userId: string, expirationMinutes: number): PasswordRecovery {
    const passwordRecovery = new PasswordRecovery();
    passwordRecovery.userId = userId;
    passwordRecovery.recoveryCode = randomUUID();
    passwordRecovery.expirationDate = add(new Date(), {
      minutes: expirationMinutes,
    });
    passwordRecovery.isConfirmed = false;
    // createdAt и updatedAt установятся автоматически

    return passwordRecovery;
  }

  /**
   * Регенерировать recovery код с новой датой истечения
   */
  regenerateCode(expirationMinutes: number): void {
    this.recoveryCode = randomUUID();
    this.expirationDate = add(new Date(), { minutes: expirationMinutes });
    this.isConfirmed = false; // Сбрасываем статус подтверждения при регенерации
    // updatedAt обновится автоматически через @UpdateDateColumn
  }

  /**
   * Подтвердить recovery код
   */
  confirm(): void {
    this.isConfirmed = true;
    // updatedAt обновится автоматически через @UpdateDateColumn
  }

  /**
   * Проверить, истек ли код
   */
  isExpired(): boolean {
    return new Date() > this.expirationDate;
  }

  /**
   * Проверить, подтвержден ли код
   */
  hasConfirmed(): boolean {
    return this.isConfirmed;
  }

  /**
   * Проверить, валиден ли код (не истек и не подтвержден)
   */
  isValid(): boolean {
    return !this.isExpired() && !this.hasConfirmed();
  }
}
