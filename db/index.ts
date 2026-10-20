import 'server-only';
import { openDatabase } from './connection';
const state = globalThis as typeof globalThis & {
  folioDatabase?: ReturnType<typeof openDatabase>;
};
export function getDatabase() {
  state.folioDatabase ??= openDatabase(
    process.env.DATABASE_PATH || './data/folio.sqlite',
  );
  if (
    Number(
      state.folioDatabase.sqlite.pragma('user_version', { simple: true }),
    ) !== 1
  )
    throw new Error('Database not initialized. Run npm run setup.');
  return state.folioDatabase.db;
}
