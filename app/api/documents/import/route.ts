import { getDatabase } from '@/db';
import { documentStore } from '@/lib/server/documents';
import { handle, json, readBytes, sameOrigin } from '@/lib/server/http';
import { requireUser } from '@/lib/server/session';
import { AppError } from '@/lib/server/errors';
import { MAX_FILE_BYTES } from '@/lib/server/validation';
import { importText } from '@/lib/import-text';
export const runtime = 'nodejs';
export const POST = (request: Request) =>
  handle(async () => {
    sameOrigin(request);
    const user = await requireUser(request);
    const bytes = await readBytes(request, MAX_FILE_BYTES + 65536);
    let form: FormData;
    try {
      form = await new Response(bytes, {
        headers: { 'Content-Type': request.headers.get('content-type') ?? '' },
      }).formData();
    } catch {
      throw new AppError(
        400,
        'INVALID_UPLOAD',
        'Choose one .txt file to import.',
      );
    }
    const files = form.getAll('file');
    if (
      files.length !== 1 ||
      !(files[0] instanceof File) ||
      [...form.keys()].some((key) => key !== 'file')
    )
      throw new AppError(
        400,
        'INVALID_UPLOAD',
        'Choose one .txt file to import.',
      );
    const file = files[0];
    const imported = importText(
      file.name,
      new Uint8Array(await file.arrayBuffer()),
    );
    return json(
      {
        document: documentStore(getDatabase()).create(
          user.id,
          imported.title,
          imported.content,
        ),
      },
      201,
    );
  });
