import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/server/session';
import { documentStore } from '@/lib/server/documents';
import { AppError } from '@/lib/server/errors';
import { getDatabase } from '@/db';
import { DocumentEditor } from '@/components/document-editor';
import { idSchema } from '@/lib/server/validation';
export const dynamic = 'force-dynamic';
export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect('/');
  const parsed = idSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  let document;
  try {
    document = documentStore(getDatabase()).get(parsed.data, user.id);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
  return (
    <DocumentEditor
      key={`${document.id}:${user.id}`}
      document={document}
      user={user}
    />
  );
}
