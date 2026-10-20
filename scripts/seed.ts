import './env';
import { openDatabase } from '../db/connection';
import { seed } from '../db/seed';
const { sqlite, db } = openDatabase(
  process.env.DATABASE_PATH || './data/folio.sqlite',
);
try {
  seed(db);
  console.log(
    'Demo users and sample document are ready. Existing work was preserved.',
  );
} finally {
  sqlite.close();
}
