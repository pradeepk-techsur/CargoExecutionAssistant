import { describe, it, expect, afterEach } from 'vitest';
import {
  createTestDatabase,
  dropTestDatabase,
  withClient,
  type TestDatabase,
} from '../helpers/testdb.js';

describe('test database harness', () => {
  let db: TestDatabase | undefined;

  afterEach(async () => {
    if (db) {
      await dropTestDatabase(db);
      db = undefined;
    }
  });

  it('creates a uniquely named, migrated database with a schema_migrations table', async () => {
    db = await createTestDatabase();
    expect(db.name).toMatch(/^cargoexec_test_[0-9a-f]{12}$/);

    const hasTable = await withClient(db.ownerUrl, async (client) => {
      const res = await client.query(
        "SELECT to_regclass('public.schema_migrations') IS NOT NULL AS present",
      );
      return res.rows[0].present as boolean;
    });
    expect(hasTable).toBe(true);
  });

  it('dropTestDatabase removes the database', async () => {
    const created = await createTestDatabase();
    await dropTestDatabase(created);

    const exists = await withClient(
      created.superuserUrl.replace(`/${created.name}`, '/postgres'),
      async (client) => {
        const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
          created.name,
        ]);
        return res.rowCount ?? 0;
      },
    );
    expect(exists).toBe(0);
  });
});
