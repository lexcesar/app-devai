import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import pg from 'pg';

// Parse numeric as float (pg returns it as string by default)
pg.types.setTypeParser(1700, (val: string) => parseFloat(val));
// Return timestamps as ISO strings (pg parses them as Date objects by default)
pg.types.setTypeParser(1114, (val: string) => val); // timestamp
pg.types.setTypeParser(1184, (val: string) => val); // timestamptz

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool!: Pool;

  onModuleInit() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('Missing DATABASE_URL environment variable');
    }
    this.pool = new Pool({ connectionString });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, values);
  }

  /**
   * Executes a callback inside a single database transaction.
   * Automatically COMMITs on success or ROLLBACKs on error.
   */
  async transaction<T>(
    fn: (
      query: (text: string, values?: unknown[]) => Promise<QueryResult>,
    ) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn((text, values) => client.query(text, values));
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
