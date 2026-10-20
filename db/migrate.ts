import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type Database from 'better-sqlite3';
export function migrate(sqlite: Database.Database) {
  const version = Number(sqlite.pragma('user_version', { simple: true }));
  if (version > 1) throw new Error('Database is newer than this application.');
  if (version === 0)
    sqlite.transaction(() => {
      sqlite.exec(
        readFileSync(resolve('db/migrations/0001_initial.sql'), 'utf8'),
      );
      sqlite.pragma('user_version = 1');
    })();
}
