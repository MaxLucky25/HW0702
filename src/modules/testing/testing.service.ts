import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class TestingService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getAllTables(): Promise<string[]> {
    const result = await this.dataSource.query<{ table_name: string }[]>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    return result.map((row) => row.table_name);
  }

  async clearAllTables(): Promise<void> {
    const tables = await this.getAllTables();

    if (tables.length === 0) {
      return;
    }

    const promises = tables.map((table) =>
      this.dataSource.query(
        `TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`,
      ),
    );

    await Promise.all(promises);
  }
}
