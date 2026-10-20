import { getDatabase } from '@/db';
import { users } from '@/db/schema';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET() {
  try {
    const ready = getDatabase()
      .select({ id: users.id })
      .from(users)
      .limit(1)
      .get();
    if (!ready) throw new Error('Demo profiles are not initialized.');
    return Response.json(
      { status: 'ok' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { status: 'unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
