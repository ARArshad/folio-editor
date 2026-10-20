import { randomUUID } from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import { documents, shares, users } from '../../db/schema';
import type { LocalDatabase } from '../../db/connection';
import { emptyContent } from '../editor-schema';
import { AppError } from './errors';
import { titleSchema, updateSchema, validateContent } from './validation';
import type { JSONContent } from '@tiptap/core';
export function documentStore(db: LocalDatabase) {
  function user(id: string) {
    return db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, id))
      .get();
  }
  function get(id: string, actor: string) {
    const doc = db.select().from(documents).where(eq(documents.id, id)).get();
    if (
      !doc ||
      (doc.ownerId !== actor &&
        !db
          .select()
          .from(shares)
          .where(and(eq(shares.documentId, id), eq(shares.userId, actor)))
          .get())
    )
      throw new AppError(
        404,
        'NOT_FOUND',
        'Document not found or not shared with you.',
      );
    return {
      ...doc,
      ownerName: user(doc.ownerId)?.name ?? 'Unknown',
      isOwner: doc.ownerId === actor,
    };
  }
  function owned(id: string, actor: string) {
    const doc = get(id, actor);
    if (!doc.isOwner)
      throw new AppError(
        403,
        'OWNER_ONLY',
        'Only the owner can rename or manage sharing.',
      );
    return doc;
  }
  return {
    user,
    users: () =>
      db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .all(),
    get,
    list(actor: string, scope: 'owned' | 'shared') {
      const fields = {
        id: documents.id,
        title: documents.title,
        ownerId: documents.ownerId,
        ownerName: users.name,
        version: documents.version,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
      };
      if (scope === 'owned')
        return db
          .select(fields)
          .from(documents)
          .innerJoin(users, eq(users.id, documents.ownerId))
          .where(eq(documents.ownerId, actor))
          .orderBy(desc(documents.updatedAt))
          .all();
      return db
        .select(fields)
        .from(documents)
        .innerJoin(users, eq(users.id, documents.ownerId))
        .innerJoin(shares, eq(shares.documentId, documents.id))
        .where(eq(shares.userId, actor))
        .orderBy(desc(documents.updatedAt))
        .all();
    },
    create(
      actor: string,
      title = 'Untitled document',
      content: JSONContent = emptyContent,
    ) {
      const now = Date.now();
      const doc = {
        id: randomUUID(),
        ownerId: actor,
        title: titleSchema.parse(title),
        content: validateContent(content),
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      db.insert(documents).values(doc).run();
      return get(doc.id, actor);
    },
    update(id: string, actor: string, input: unknown) {
      const data = updateSchema.parse(input);
      return db.transaction(() => {
        const current = get(id, actor);
        if (data.title !== undefined && !current.isOwner)
          throw new AppError(
            403,
            'OWNER_ONLY',
            'Only the owner can rename this document.',
          );
        const content =
          data.content === undefined
            ? undefined
            : validateContent(data.content);
        const changed = db
          .update(documents)
          .set({
            ...(data.title !== undefined ? { title: data.title } : {}),
            ...(content ? { content } : {}),
            version: sql`${documents.version} + 1`,
            updatedAt: Date.now(),
          })
          .where(and(eq(documents.id, id), eq(documents.version, data.version)))
          .returning()
          .get();
        if (!changed)
          throw new AppError(
            409,
            'VERSION_CONFLICT',
            'A newer version was saved elsewhere. Your draft is still here. Copy it before reloading.',
          );
        return get(id, actor);
      });
    },
    recipients(id: string, actor: string) {
      owned(id, actor);
      return db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(shares)
        .innerJoin(users, eq(shares.userId, users.id))
        .where(eq(shares.documentId, id))
        .all();
    },
    share(id: string, actor: string, recipient: string) {
      return db.transaction(() => {
        owned(id, actor);
        if (recipient === actor || !user(recipient))
          throw new AppError(
            400,
            'INVALID_RECIPIENT',
            'Select another demo user.',
          );
        db.insert(shares)
          .values({ documentId: id, userId: recipient, createdAt: Date.now() })
          .onConflictDoNothing()
          .run();
        return { ok: true };
      });
    },
  };
}
