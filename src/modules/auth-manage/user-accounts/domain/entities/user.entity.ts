import {
  Entity,
  Column,
  OneToOne,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CreateUserDomainDto } from '../dto/create-user.domain.dto';
import { randomUUID } from 'crypto';
import { EmailConfirmation } from './email-confirmation.entity';

@Entity('users')
export class User {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  login: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column()
  email: string;

  @Column({ name: 'is_email_confirmed', default: false })
  isEmailConfirmed: boolean;

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

  @Column({
    name: 'deleted_at',
    type: 'timestamp',
    nullable: true,
  })
  deletedAt: Date | null;

  @OneToOne(
    () => EmailConfirmation,
    (emailConfirmation) => emailConfirmation.user,
    {
      cascade: true, // Каскадное создание/обновление EmailConfirmation при сохранении User
    },
  )
  emailConfirmation?: EmailConfirmation;

  /**
   * Статический метод для создания нового пользователя
   */
  static create(dto: CreateUserDomainDto): User {
    const user = new User();
    user.id = randomUUID();
    user.login = dto.login;
    user.email = dto.email;
    user.passwordHash = dto.passwordHash;
    user.isEmailConfirmed = false;
    user.deletedAt = null;
    // createdAt и updatedAt установятся автоматически через @CreateDateColumn и @UpdateDateColumn

    // EmailConfirmation всегда создается каскадно
    user.emailConfirmation = EmailConfirmation.create(
      user.id,
      dto.emailConfirmationExpirationMinutes,
    );

    return user;
  }

  /**
   * Подтвердить email пользователя
   */
  confirmEmail(): void {
    this.isEmailConfirmed = true;
  }

  /**
   * Обновить пароль пользователя
   */
  updatePassword(passwordHash: string): void {
    this.passwordHash = passwordHash;
    // updatedAt обновится автоматически через @UpdateDateColumn
  }

  /**
   * Обновить логин и email
   */
  updateLoginAndEmail(login: string, email: string): void {
    this.login = login;
    this.email = email;
    // updatedAt обновится автоматически через @UpdateDateColumn
  }

  /**
   * Выполнить мягкое удаление (soft delete)
   */
  softDelete(): void {
    this.deletedAt = new Date();
    // updatedAt обновится автоматически через @UpdateDateColumn
  }
  /**
   * Проверить, подтвержден ли email
   */
  hasEmailConfirmed(): boolean {
    return this.isEmailConfirmed;
  }
}
