import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../db/connection';
import { migrate } from '../db/migrate';
import { DEMO_USERS, seed } from '../db/seed';
import { documentStore } from '../lib/server/documents';
import { textToContent } from '../lib/editor-schema';
import { importText } from '../lib/import-text';
import { validateContent } from '../lib/server/validation';
const [alex, sam, jordan] = DEMO_USERS;
let folder: string;
let connection: ReturnType<typeof openDatabase>;
let store: ReturnType<typeof documentStore>;
beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'folio-service-'));
  connection = openDatabase(join(folder, 'test.sqlite'));
  migrate(connection.sqlite);
  seed(connection.db);
  store = documentStore(connection.db);
});
afterEach(() => {
  connection.sqlite.close();
  rmSync(folder, { recursive: true });
});
describe('real SQLite document access', () => {
  it('enforces ownership, sharing, persistence and idempotent grants', () => {
    const doc = store.create(alex.id, 'Access test');
    expect(() => store.get(doc.id, jordan.id)).toThrow('not found');
    expect(() =>
      store.update(doc.id, jordan.id, {
        version: 1,
        content: textToContent('No'),
      }),
    ).toThrow('not found');
    expect(store.list(jordan.id, 'shared')).toEqual([]);
    store.share(doc.id, alex.id, sam.id);
    store.share(doc.id, alex.id, sam.id);
    expect(store.recipients(doc.id, alex.id)).toHaveLength(1);
    expect(store.list(sam.id, 'shared').map((item) => item.id)).toContain(
      doc.id,
    );
    expect(() =>
      store.update(doc.id, sam.id, { version: 1, title: 'Not allowed' }),
    ).toThrow('Only the owner');
    expect(() => store.share(doc.id, sam.id, jordan.id)).toThrow(
      'Only the owner',
    );
    const content = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [
            { type: 'text', text: 'Shared', marks: [{ type: 'bold' }] },
          ],
        },
      ],
    };
    store.update(doc.id, sam.id, { version: 1, content });
    connection.sqlite.close();
    connection = openDatabase(join(folder, 'test.sqlite'));
    store = documentStore(connection.db);
    expect(store.get(doc.id, alex.id).content).toEqual(content);
    expect(store.get(doc.id, sam.id).version).toBe(2);
    seed(connection.db);
    expect(store.get(doc.id, sam.id).content).toEqual(content);
  });
  it('atomically rejects stale versions without losing the first save', () => {
    const doc = store.create(alex.id);
    store.update(doc.id, alex.id, {
      version: 1,
      content: textToContent('First save'),
    });
    expect(() =>
      store.update(doc.id, alex.id, {
        version: 1,
        content: textToContent('Stale'),
      }),
    ).toThrow('newer version');
    expect(store.get(doc.id, alex.id).content).toEqual(
      textToContent('First save'),
    );
  });
  it('does not permit unsupported fields or malformed content', () => {
    const doc = store.create(alex.id);
    expect(() =>
      store.update(doc.id, alex.id, { version: 1, ownerId: sam.id }),
    ).toThrow();
    expect(() =>
      store.update(doc.id, alex.id, { version: 1, title: '   ' }),
    ).toThrow();
    expect(() =>
      validateContent({
        type: 'doc',
        content: [{ type: 'image', attrs: { src: 'javascript:bad' } }],
      }),
    ).toThrow();
    expect(() =>
      validateContent({
        type: 'doc',
        content: [{ type: 'heading', attrs: { level: 3 } }],
      }),
    ).toThrow();
    expect(store.get(doc.id, alex.id).version).toBe(1);
  });
});
describe('structural limits', () => {
  it('rejects deeply nested content before recursive serialization', () => {
    let content: unknown = { type: 'paragraph' };
    for (let depth = 0; depth < 1000; depth++)
      content = { type: 'doc', content: [content] };
    expect(() => validateContent(content)).toThrow(
      'unsupported formatting or structure',
    );
  });
  it('rejects invalid list numbering attributes', () => {
    expect(() =>
      validateContent({
        type: 'doc',
        content: [
          { type: 'orderedList', attrs: { start: 'bad' }, content: [] },
        ],
      }),
    ).toThrow('Unsupported document attributes');
  });
});

describe('text import', () => {
  it('preserves literal text, Unicode and blank lines', () => {
    const imported = importText(
      'Notes.txt',
      new TextEncoder().encode('Hello 🌿\r\n\r\n<script>alert(1)</script>'),
    );
    expect(imported.title).toBe('Notes');
    expect(imported.content).toEqual(
      textToContent('Hello 🌿\n\n<script>alert(1)</script>'),
    );
    expect(importText('empty.txt', new Uint8Array()).content).toEqual(
      textToContent(''),
    );
  });
  it('rejects unsupported, invalid, binary and oversized files', () => {
    expect(() => importText('bad.pdf', new Uint8Array())).toThrow('UTF-8 .txt');
    expect(() => importText('bad.txt', new Uint8Array([255]))).toThrow(
      'not valid UTF-8',
    );
    expect(() => importText('bad.txt', new Uint8Array([0]))).toThrow('Binary');
    expect(() =>
      importText('big.txt', new Uint8Array(1024 * 1024 + 1)),
    ).toThrow('1 MiB');
  });
});
