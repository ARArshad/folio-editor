import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AppError } from './errors';
import { MAX_DOCUMENT_BYTES } from './validation';
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
export async function handle(work: () => Promise<Response> | Response) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof AppError)
      return json(
        { error: { code: error.code, message: error.message } },
        error.status,
      );
    if (error instanceof z.ZodError)
      return json(
        {
          error: {
            code: 'VALIDATION',
            message: error.issues[0]?.message ?? 'Invalid request.',
          },
        },
        400,
      );
    if (error instanceof SyntaxError)
      return json(
        {
          error: {
            code: 'INVALID_JSON',
            message: 'The request is not valid JSON.',
          },
        },
        400,
      );
    console.error(
      '[Folio] Request failed:',
      error instanceof Error ? error.name : 'UnknownError',
    );
    return json(
      {
        error: {
          code: 'SERVER_ERROR',
          message:
            'Something went wrong. Please retry. If it continues, check the local server.',
        },
      },
      500,
    );
  }
}
export function sameOrigin(request: Request) {
  const url = new URL(request.url);
  const expected = process.env.APP_ORIGIN
    ? new URL(process.env.APP_ORIGIN).origin
    : `${url.protocol}//${request.headers.get('host') ?? url.host}`;
  if (request.headers.get('origin') !== expected)
    throw new AppError(403, 'ORIGIN', 'This action must come from this app.');
}
export async function readBytes(request: Request, limit: number) {
  if (Number(request.headers.get('content-length')) > limit)
    throw new AppError(
      413,
      'TOO_LARGE',
      'The upload or document is too large.',
    );
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new AppError(
          413,
          'TOO_LARGE',
          'The upload or document is too large.',
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
export async function readJson(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json'))
    throw new AppError(400, 'CONTENT_TYPE', 'Send application/json.');
  return JSON.parse(
    new TextDecoder().decode(
      await readBytes(request, MAX_DOCUMENT_BYTES + 1024),
    ),
  ) as unknown;
}
