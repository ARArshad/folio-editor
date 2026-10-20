import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { config } from 'dotenv';
import { openDatabase } from '../db/connection';
import { migrate } from '../db/migrate';
import { seed } from '../db/seed';
const path = '.env.local';
let env = existsSync(path)
  ? readFileSync(path, 'utf8')
  : 'DATABASE_PATH=./data/folio.sqlite\nSESSION_SECRET=\n';
if (!/^SESSION_SECRET=.+/m.test(env)) {
  const secret = randomBytes(48).toString('base64url');
  env = /^SESSION_SECRET=/m.test(env)
    ? env.replace(/^SESSION_SECRET=.*$/m, `SESSION_SECRET=${secret}`)
    : `${env}\nSESSION_SECRET=${secret}\n`;
  writeFileSync(path, env, { mode: 0o600 });
}
config({ path, quiet: true });
const { db, sqlite } = openDatabase(
  process.env.DATABASE_PATH || './data/folio.sqlite',
);
try {
  migrate(sqlite);
  seed(db);
  console.log(
    'Folio is ready. Run npm run dev and open http://127.0.0.1:3000.',
  );
} finally {
  sqlite.close();
}
