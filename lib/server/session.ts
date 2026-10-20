import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { getDatabase } from '../../db';
import { documentStore } from './documents';
import { AppError } from './errors';
export const SESSION_COOKIE = 'folio_session';
export const SESSION_AGE = 60 * 60 * 24 * 7;
function signature(payload: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error(
      'SESSION_SECRET must have at least 32 characters. Run npm run setup.',
    );
  return createHmac('sha256', secret).update(payload).digest('base64url');
}
export function signSession(id: string) {
  const payload = `${id}.${Math.floor(Date.now() / 1000) + SESSION_AGE}`;
  return `${payload}.${signature(payload)}`;
}
export async function currentUser() {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split('.');
  if (parts.length !== 3) return null;
  const [id, expires, supplied] = parts;
  if (
    !id ||
    !expires ||
    !supplied ||
    !/^\d+$/.test(expires) ||
    Number(expires) < Date.now() / 1000
  )
    return null;
  const expected = Buffer.from(signature(`${id}.${expires}`));
  const received = Buffer.from(supplied);
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  )
    return null;
  return documentStore(getDatabase()).user(id) ?? null;
}
export async function requireUser(request?: Request) {
  const user = await currentUser();
  if (!user)
    throw new AppError(
      401,
      'UNAUTHENTICATED',
      'Choose a demo user to continue.',
    );
  const expected = request?.headers.get('x-folio-user');
  if (expected && expected !== user.id)
    throw new AppError(
      409,
      'SESSION_CHANGED',
      'Your demo profile changed in another tab. Copy your draft and reopen this document under the original profile.',
    );
  return user;
}
