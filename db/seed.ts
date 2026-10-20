import { textToContent } from '../lib/editor-schema';
import { documents, users } from './schema';
import type { LocalDatabase } from './connection';
export const DEMO_USERS = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Alex Morgan',
    email: 'alex@example.com',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Sam Taylor',
    email: 'sam@example.com',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Jordan Lee',
    email: 'jordan@example.com',
  },
] as const;
export function seed(db: LocalDatabase) {
  db.transaction((tx) => {
    for (const user of DEMO_USERS)
      tx.insert(users)
        .values({ ...user, createdAt: Date.now() })
        .onConflictDoNothing()
        .run();
    tx.insert(documents)
      .values({
        id: '44444444-4444-4444-8444-444444444444',
        ownerId: DEMO_USERS[0].id,
        title: 'A little space for your next big idea',
        content: textToContent(
          'Welcome to Folio\n\nGood work starts with a place to think. This is yours.\n\nTry a heading, make a list, or share this document with Sam. Your changes stay saved in this workspace.\n\nA few things to try\nCreate a document from scratch.\nImport a plain-text file.\nShare an idea and switch demo users to keep the conversation going.',
        ),
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      .onConflictDoNothing()
      .run();
  });
}
