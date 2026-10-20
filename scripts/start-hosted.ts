import { spawn } from 'node:child_process';
import { isAbsolute, resolve } from 'node:path';
import { openDatabase } from '../db/connection';
import { migrate } from '../db/migrate';
import { seed } from '../db/seed';

const secret = process.env.SESSION_SECRET;
if (!secret || secret.length < 32)
  throw new Error(
    'Set a persistent SESSION_SECRET with at least 32 characters.',
  );
const databasePath = process.env.DATABASE_PATH;
if (!databasePath || !isAbsolute(databasePath))
  throw new Error(
    'Set DATABASE_PATH to an absolute path on the persistent volume.',
  );
const origin = new URL(process.env.APP_ORIGIN || '');
if (
  origin.href !== `${origin.origin}/` ||
  origin.username ||
  origin.password ||
  (origin.protocol !== 'https:' &&
    !(
      origin.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(origin.hostname)
    ))
) {
  throw new Error(
    'APP_ORIGIN must be the public HTTPS origin, without a path or credentials.',
  );
}
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('PORT must be an integer between 1 and 65535.');

// Run after the volume is mounted. Migration and seeding preserve existing work.
const connection = openDatabase(databasePath);
try {
  migrate(connection.sqlite);
  seed(connection.db);
} finally {
  connection.sqlite.close();
}
const server = spawn(
  process.execPath,
  [
    resolve('node_modules/next/dist/bin/next'),
    'start',
    '--hostname',
    '0.0.0.0',
    '--port',
    String(port),
  ],
  { stdio: 'inherit', env: process.env },
);
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => server.kill(signal));
}
server.once('error', (error) => {
  console.error(error.message);
  process.exit(1);
});
server.once('exit', (code) => process.exit(code ?? 1));
