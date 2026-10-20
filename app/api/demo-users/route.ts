import { getDatabase } from '@/db';
import { documentStore } from '@/lib/server/documents';
import { handle, json } from '@/lib/server/http';
export const runtime = 'nodejs';
export const GET = () =>
  handle(() => json({ users: documentStore(getDatabase()).users() }));
