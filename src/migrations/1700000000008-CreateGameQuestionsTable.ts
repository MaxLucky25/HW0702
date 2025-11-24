import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateGameQuestionsTable1700000000008
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'game_questions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'game_id',
            type: 'uuid',
          },
          {
            name: 'question_id',
            type: 'uuid',
          },
          {
            name: 'order',
            type: 'int',
          },
        ],
      }),
      true,
    );

    // Создаем внешние ключи
    await queryRunner.createForeignKey(
      'game_questions',
      new TableForeignKey({
        columnNames: ['game_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'pair_games',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'game_questions',
      new TableForeignKey({
        columnNames: ['question_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'questions',
        onDelete: 'CASCADE',
      }),
    );

    // Создаем уникальный индекс
    await queryRunner.createIndex(
      'game_questions',
      new TableIndex({
        name: 'IDX_game_questions_game_id_order',
        columnNames: ['game_id', 'order'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('game_questions');
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('game_questions', foreignKey);
      }
    }

    await queryRunner.dropIndex(
      'game_questions',
      'IDX_game_questions_game_id_order',
    );
    await queryRunner.dropTable('game_questions');
  }
}
