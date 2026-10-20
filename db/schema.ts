import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';
import type { JSONContent } from '@tiptap/core';
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: integer('created_at').notNull(),
});
export const documents = sqliteTable(
  'documents',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id),
    title: text('title').notNull(),
    content: text('content', { mode: 'json' }).$type<JSONContent>().notNull(),
    version: integer('version').notNull().default(1),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [index('documents_owner_idx').on(table.ownerId)],
);
export const shares = sqliteTable(
  'document_shares',
  {
    documentId: text('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.documentId, table.userId] }),
    index('shares_user_idx').on(table.userId),
  ],
);
