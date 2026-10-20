import { getDatabase } from '@/db';
import { documentStore } from '@/lib/server/documents';
import { handle, json, readJson, sameOrigin } from '@/lib/server/http';
import { requireUser } from '@/lib/server/session';
import { idSchema } from '@/lib/server/validation';
export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
export const GET = (request: Request, context: Context) =>
  handle(async () => {
    const user = await requireUser(request);
    const id = idSchema.parse((await context.params).id);
    return json({ document: documentStore(getDatabase()).get(id, user.id) });
  });
export const PATCH = (request: Request, context: Context) =>
  handle(async () => {
    sameOrigin(request);
    const user = await requireUser(request);
    const id = idSchema.parse((await context.params).id);
    return json({
      document: documentStore(getDatabase()).update(
        id,
        user.id,
        await readJson(request),
      ),
    });
  });
