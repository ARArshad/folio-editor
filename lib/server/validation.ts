import { z } from 'zod';
import type { JSONContent } from '@tiptap/core';
import { editorSchema } from '../editor-schema';
import { AppError } from './errors';
export const titleSchema = z
  .string()
  .trim()
  .min(1, 'Enter a document title.')
  .max(200, 'Titles can have up to 200 characters.');
export const idSchema = z.uuid();
export const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
export const MAX_FILE_BYTES = 1024 * 1024;
const nodeSchema = z
  .object({
    type: z.enum([
      'doc',
      'paragraph',
      'text',
      'heading',
      'bulletList',
      'orderedList',
      'listItem',
      'hardBreak',
    ]),
    text: z.string().optional(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    marks: z
      .array(
        z
          .object({ type: z.enum(['bold', 'italic', 'underline', 'code']) })
          .strict(),
      )
      .optional(),
    content: z.array(z.unknown()).optional(),
  })
  .strict();
const headingAttributes = z
  .object({ level: z.union([z.literal(1), z.literal(2)]) })
  .strict();
const listAttributes = z
  .object({
    start: z.number().int().min(1).max(2147483647).optional(),
    type: z.enum(['1', 'a', 'A', 'i', 'I']).nullable().optional(),
  })
  .strict();
export function validateContent(value: unknown): JSONContent {
  const stack: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
  let count = 0;
  while (stack.length) {
    const item = stack.pop();
    if (!item) break;
    const node = nodeSchema.safeParse(item.value);
    if (!node.success || ++count > 50000 || item.depth > 32)
      throw new AppError(
        400,
        'INVALID_CONTENT',
        'The document contains unsupported formatting or structure.',
      );
    if (node.data.attrs) {
      const valid =
        node.data.type === 'heading'
          ? headingAttributes.safeParse(node.data.attrs).success
          : node.data.type === 'orderedList'
            ? listAttributes.safeParse(node.data.attrs).success
            : Object.keys(node.data.attrs).length === 0;
      if (!valid)
        throw new AppError(
          400,
          'INVALID_CONTENT',
          'Unsupported document attributes. Use heading levels 1 or 2 and valid list numbering.',
        );
    }
    for (const child of node.data.content ?? [])
      stack.push({ value: child, depth: item.depth + 1 });
  }
  // Check depth before serialization so deeply nested requests do not overflow the stack.
  const encoded = JSON.stringify(value);
  if (new TextEncoder().encode(encoded).byteLength > MAX_DOCUMENT_BYTES)
    throw new AppError(413, 'TOO_LARGE', 'This document is too large to save.');
  try {
    const parsed = editorSchema.nodeFromJSON(value);
    parsed.check();
    if (parsed.type.name !== 'doc') throw new Error('Expected document');
    return parsed.toJSON() as JSONContent;
  } catch {
    throw new AppError(
      400,
      'INVALID_CONTENT',
      'The document structure is invalid.',
    );
  }
}
export const updateSchema = z
  .object({
    version: z.number().int().positive(),
    title: titleSchema.optional(),
    content: z.unknown().optional(),
  })
  .strict()
  .refine(
    (data) => data.title !== undefined || data.content !== undefined,
    'No changes supplied.',
  );
