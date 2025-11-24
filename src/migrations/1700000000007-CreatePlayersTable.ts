import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreatePlayersTable1700000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'players',
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
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['firstPlayer', 'secondPlayer'],
          },
          {
            name: 'score',
            type: 'int',
            default: 0,
          },
          {
            name: 'bonus',
            type: 'int',
            default: 0,
          },
          {
            name: 'finished_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Создаем внешние ключи
    await queryRunner.createForeignKey(
      'players',
      new TableForeignKey({
        columnNames: ['game_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'pair_games',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'players',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Создаем уникальные индексы
    await queryRunner.createIndex(
      'players',
      new TableIndex({
        name: 'IDX_players_game_id_user_id',
        columnNames: ['game_id', 'user_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'players',
      new TableIndex({
        name: 'IDX_players_game_id_role',
        columnNames: ['game_id', 'role'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('players');
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('players', foreignKey);
      }
    }

    await queryRunner.dropIndex('players', 'IDX_players_game_id_user_id');
    await queryRunner.dropIndex('players', 'IDX_players_game_id_role');
    await queryRunner.dropTable('players');
  }
}
