import { z } from 'zod';
import { getDatabase } from '@/db';
import { documentStore } from '@/lib/server/documents';
import { AppError } from '@/lib/server/errors';
import { handle, json, readJson, sameOrigin } from '@/lib/server/http';
import {
  currentUser,
  SESSION_AGE,
  SESSION_COOKIE,
  signSession,
} from '@/lib/server/session';
export const runtime = 'nodejs';
export const GET = () =>
  handle(async () => json({ user: await currentUser() }));
export const POST = (request: Request) =>
  handle(async () => {
    sameOrigin(request);
    const { userId } = z
      .object({ userId: z.uuid() })
      .strict()
      .parse(await readJson(request));
    const user = documentStore(getDatabase()).user(userId);
    if (!user)
      throw new AppError(400, 'INVALID_USER', 'Select a valid demo user.');
    const response = json({ user });
    response.cookies.set(SESSION_COOKIE, signSession(user.id), {
      httpOnly: true,
      sameSite: 'strict',
      secure:
        new URL(process.env.APP_ORIGIN || request.url).protocol === 'https:',
      path: '/',
      maxAge: SESSION_AGE,
    });
    return response;
  });
export const DELETE = (request: Request) =>
  handle(() => {
    sameOrigin(request);
    const response = json({ ok: true });
    response.cookies.delete(SESSION_COOKIE);
    return response;
  });
