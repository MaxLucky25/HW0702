import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { CreateQuestionDomainDto } from '../dto/create-question.domain.dto';
import { UpdateQuestionDomainDto } from '../dto/update-question.domain.dto';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'json', name: 'correct_answers' })
  correctAnswers: string[];

  @Column({ default: false })
  published: boolean;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
  })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'timestamp',
    nullable: true,
  })
  updatedAt: Date | null;

  /**
   * Статический метод для создания нового вопроса
   */
  static create(dto: CreateQuestionDomainDto): Question {
    const question = new Question();
    question.body = dto.body;
    question.correctAnswers = dto.correctAnswers;
    question.published = false;
    question.updatedAt = null; // При создании updatedAt должен быть null
    // createdAt установится автоматически через @CreateDateColumn

    return question;
  }

  /**
   * Опубликовать вопрос
   */
  publish(): void {
    this.published = true;
    this.updatedAt = new Date();
  }

  /**
   * Снять вопрос с публикации
   */
  unpublish(): void {
    this.published = false;
    this.updatedAt = new Date();
  }

  /**
   * Обновить вопрос
   */
  update(dto: UpdateQuestionDomainDto): void {
    if (dto.body !== undefined) {
      this.body = dto.body;
    }
    if (dto.correctAnswers !== undefined) {
      this.correctAnswers = dto.correctAnswers;
    }
    this.updatedAt = new Date();
  }

  /**
   * Проверить, является ли ответ правильным
   */
  isAnswerCorrect(answer: string): boolean {
    return this.correctAnswers.some(
      (correct) => correct.toLowerCase().trim() === answer.toLowerCase().trim(),
    );
  }
}
