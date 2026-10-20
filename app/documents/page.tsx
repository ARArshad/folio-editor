import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/server/session';
import { documentStore } from '@/lib/server/documents';
import { getDatabase } from '@/db';
import { Dashboard } from '@/components/dashboard';
export const dynamic = 'force-dynamic';
export default async function Documents({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect('/');
  const scope = (await searchParams).scope === 'shared' ? 'shared' : 'owned';
  return (
    <Dashboard
      user={user}
      scope={scope}
      documents={documentStore(getDatabase()).list(user.id, scope)}
    />
  );
}
