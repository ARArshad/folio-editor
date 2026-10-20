import './env';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
let failed = false;
function check(ok: boolean, message: string) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${message}`);
  failed ||= !ok;
}
check(
  process.versions.node.split('.')[0] === '24',
  'Use the pinned Node 24 LTS runtime (.nvmrc).',
);
check(
  (process.env.SESSION_SECRET?.length ?? 0) >= 32,
  'Session secret configured (value hidden). Run npm run setup if missing.',
);
const path = resolve(process.env.DATABASE_PATH || './data/folio.sqlite');
check(existsSync(path), 'Local database exists. Run npm run setup if missing.');
if (existsSync(path)) {
  const db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    check(
      Number(db.pragma('user_version', { simple: true })) === 1,
      'Database schema is current.',
    );
    check(
      db.pragma('quick_check', { simple: true }) === 'ok',
      'SQLite integrity check.',
    );
  } finally {
    db.close();
  }
}
process.exitCode = failed ? 1 : 0;
