import { z } from 'zod';
import { getDatabase } from '@/db';
import { documentStore } from '@/lib/server/documents';
import { handle, json, sameOrigin } from '@/lib/server/http';
import { requireUser } from '@/lib/server/session';
export const runtime = 'nodejs';
export const GET = (request: Request) =>
  handle(async () => {
    const user = await requireUser(request);
    const scope = z
      .enum(['owned', 'shared'])
      .parse(new URL(request.url).searchParams.get('scope') ?? 'owned');
    return json({
      documents: documentStore(getDatabase()).list(user.id, scope),
    });
  });
export const POST = (request: Request) =>
  handle(async () => {
    sameOrigin(request);
    const user = await requireUser(request);
    return json(
      { document: documentStore(getDatabase()).create(user.id) },
      201,
    );
  });
