import './env';
import { openDatabase } from '../db/connection';
import { migrate } from '../db/migrate';
const { sqlite } = openDatabase(
  process.env.DATABASE_PATH || './data/folio.sqlite',
);
try {
  migrate(sqlite);
  console.log('Database migrations applied.');
} finally {
  sqlite.close();
}
