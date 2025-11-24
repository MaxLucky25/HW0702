import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateGameAnswersTable1700000000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'game_answers',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'game_question_id',
            type: 'uuid',
          },
          {
            name: 'player_id',
            type: 'uuid',
          },
          {
            name: 'answer',
            type: 'text',
          },
          {
            name: 'is_correct',
            type: 'boolean',
          },
          {
            name: 'added_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Создаем внешние ключи
    await queryRunner.createForeignKey(
      'game_answers',
      new TableForeignKey({
        columnNames: ['game_question_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'game_questions',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'game_answers',
      new TableForeignKey({
        columnNames: ['player_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'players',
        onDelete: 'CASCADE',
      }),
    );

    // Создаем уникальный индекс
    await queryRunner.createIndex(
      'game_answers',
      new TableIndex({
        name: 'IDX_game_answers_game_question_id_player_id',
        columnNames: ['game_question_id', 'player_id'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('game_answers');
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('game_answers', foreignKey);
      }
    }

    await queryRunner.dropIndex(
      'game_answers',
      'IDX_game_answers_game_question_id_player_id',
    );
    await queryRunner.dropTable('game_answers');
  }
}
