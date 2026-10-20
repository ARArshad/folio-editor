import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { openDatabase } from '../db/connection';
import { migrate } from '../db/migrate';
import { seed } from '../db/seed';
export function isolatedServer(
  port: number,
  options: { hosted?: boolean; origin?: string } = {},
) {
  const directory = mkdtempSync(join(tmpdir(), 'folio-e2e-'));
  const databasePath = join(directory, 'test.sqlite');
  if (!options.hosted) {
    const connection = openDatabase(databasePath);
    migrate(connection.sqlite);
    seed(connection.db);
    connection.sqlite.close();
  }
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: 'production',
    DATABASE_PATH: databasePath,
    SESSION_SECRET: randomBytes(48).toString('base64url'),
    NEXT_TELEMETRY_DISABLED: '1',
    APP_ORIGIN: options.origin || '',
    PORT: String(port),
  };
  let child: ChildProcess | undefined;
  let logs = '';
  return {
    url: `http://127.0.0.1:${port}`,
    async start() {
      child = spawn(
        process.execPath,
        options.hosted
          ? ['--import', 'tsx', resolve('scripts/start-hosted.ts')]
          : [
              resolve('node_modules/next/dist/bin/next'),
              'start',
              '--hostname',
              '127.0.0.1',
              '--port',
              String(port),
            ],
        { env, stdio: ['ignore', 'pipe', 'pipe'] },
      );
      child.stdout?.on('data', (value) => {
        logs += String(value);
      });
      child.stderr?.on('data', (value) => {
        logs += String(value);
      });
      const started = Date.now();
      while (Date.now() - started < 30000) {
        if (child.exitCode !== null)
          throw new Error(`Test server exited: ${logs}`);
        try {
          if (
            (
              await fetch(
                `http://127.0.0.1:${port}${options.hosted ? '/api/health' : '/api/demo-users'}`,
              )
            ).ok
          )
            return;
        } catch {
          /* Wait for the owned test server. */
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      throw new Error(`Test server did not start: ${logs}`);
    },
    async stop() {
      if (!child || child.exitCode !== null) return;
      const stopped = new Promise<void>((resolve) =>
        child?.once('exit', () => resolve()),
      );
      child.kill('SIGTERM');
      await stopped;
    },
    cleanup() {
      rmSync(directory, { recursive: true, force: true });
    },
  };
}
