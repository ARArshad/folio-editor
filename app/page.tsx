import { redirect } from 'next/navigation';
import { getDatabase } from '@/db';
import { documentStore } from '@/lib/server/documents';
import { currentUser } from '@/lib/server/session';
import { UserPicker } from '@/components/user-picker';
export const dynamic = 'force-dynamic';
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ switch?: string }>;
}) {
  const user = await currentUser();
  if (user && (await searchParams).switch !== '1') redirect('/documents');
  return (
    <UserPicker
      users={documentStore(getDatabase()).users()}
      activeId={user?.id}
    />
  );
}
