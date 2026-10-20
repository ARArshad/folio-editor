import { z } from 'zod';
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
    return json({
      users: documentStore(getDatabase()).recipients(id, user.id),
    });
  });
export const POST = (request: Request, context: Context) =>
  handle(async () => {
    sameOrigin(request);
    const user = await requireUser(request);
    const id = idSchema.parse((await context.params).id);
    const { userId } = z
      .object({ userId: z.uuid() })
      .strict()
      .parse(await readJson(request));
    return json(documentStore(getDatabase()).share(id, user.id, userId));
  });
