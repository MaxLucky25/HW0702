import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreatePairGamesTable1700000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'pair_games',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PendingSecondPlayer', 'Active', 'Finished'],
            default: "'PendingSecondPlayer'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'start_game_date',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'finish_game_date',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Создаем индекс для матчмейкинга
    await queryRunner.createIndex(
      'pair_games',
      new TableIndex({
        name: 'IDX_pair_games_status_created_at',
        columnNames: ['status', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'pair_games',
      'IDX_pair_games_status_created_at',
    );
    await queryRunner.dropTable('pair_games');
  }
}
