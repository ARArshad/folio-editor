import { expect, test } from './fixtures';
import {
  create,
  login,
  saved,
  share,
  mutate,
  sam,
  jordan,
  alex,
} from './helpers';
import { textToContent } from '../lib/editor-schema';
import { isolatedServer } from '../scripts/test-server';

test('identity persists and create, rename, formatted edits survive reopening', async ({
  page,
}) => {
  await login(page);
  await page.reload();
  await expect(
    page.getByRole('link', { name: 'Switch demo user' }),
  ).toBeVisible();
  const id = await create(page);
  await page
    .getByLabel('Document title', { exact: true })
    .fill('Formatting round trip');
  const editor = page.getByRole('textbox', { name: 'Document content' });
  await editor.fill('A thoughtful beginning');
  await editor.press('ControlOrMeta+a');
  for (const label of ['Bold', 'Italic', 'Underline'])
    await page.getByRole('button', { name: label, exact: true }).click();
  await page.getByLabel('Text style').selectOption('1');
  await saved(page);
  await page.reload();
  await expect(page.getByLabel('Document title', { exact: true })).toHaveValue(
    'Formatting round trip',
  );
  await expect(editor.locator('h1 strong em u')).toHaveText(
    'A thoughtful beginning',
  );
  await page.getByLabel('Text style').selectOption('2');
  await saved(page);
  await page.reload();
  await expect(editor.locator('h2')).toContainText('A thoughtful beginning');
  await editor.click();
  await editor.press('ControlOrMeta+a');
  await page.getByLabel('Text style').selectOption('0');
  await page
    .getByRole('button', { name: 'Bulleted list', exact: true })
    .click();
  await saved(page);
  await page.reload();
  await expect(editor.locator('ul')).toContainText('A thoughtful beginning');
  await editor.click();
  await editor.press('ControlOrMeta+a');
  await page
    .getByRole('button', { name: 'Numbered list', exact: true })
    .click();
  await saved(page);
  await page.reload();
  await expect(editor.locator('ol')).toContainText('A thoughtful beginning');
  await page.getByRole('button', { name: 'Back to documents' }).click();
  await page.getByRole('link', { name: /Formatting round trip/ }).click();
  await expect(page).toHaveURL(new RegExp(id));
});

test('text import preserves paragraphs and literal markup; empty import works', async ({
  page,
}) => {
  await login(page);
  await page.getByLabel('Import text file').setInputFiles({
    name: 'Imported notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Hello 🌿\n\n<script>literal</script>'),
  });
  const editor = page.getByRole('textbox', { name: 'Document content' });
  await expect(editor).toContainText('<script>literal</script>');
  await expect(editor.locator('p')).toHaveCount(3);
  await expect(page.getByLabel('Document title', { exact: true })).toHaveValue(
    'Imported notes',
  );
  await editor.press('ControlOrMeta+End');
  await editor.pressSequentially(' edited');
  await saved(page);
  await page.reload();
  await expect(editor).toContainText('edited');
  await page.getByRole('button', { name: 'Back to documents' }).click();
  await page.getByLabel('Import text file').setInputFiles({
    name: 'empty.txt',
    mimeType: 'text/plain',
    buffer: Buffer.alloc(0),
  });
  await expect(page.getByLabel('Document title', { exact: true })).toHaveValue(
    'empty',
  );
  await expect(editor).toBeEmpty();
});

test('invalid imports are rejected without creating documents', async ({
  page,
}) => {
  await login(page);
  const before = (await (await page.request.get('/api/documents')).json())
    .documents.length;
  const file = page.getByLabel('Import text file');
  await file.setInputFiles({
    name: 'wrong.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('no'),
  });
  await expect(page.getByRole('alert', { name: 'Import error' })).toContainText(
    'UTF-8 .txt',
  );
  await file.setInputFiles({
    name: 'big.txt',
    mimeType: 'text/plain',
    buffer: Buffer.alloc(1024 * 1024 + 1, 65),
  });
  await expect(page.getByRole('alert', { name: 'Import error' })).toContainText(
    '1 MiB',
  );
  await file.setInputFiles({
    name: 'invalid.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from([255]),
  });
  await expect(page.getByRole('alert', { name: 'Import error' })).toContainText(
    'not valid UTF-8',
  );
  const oversized = await page.request.post('/api/documents/import', {
    headers: { Origin: 'http://127.0.0.1:3107' },
    multipart: {
      file: {
        name: 'big.txt',
        mimeType: 'text/plain',
        buffer: Buffer.alloc(1024 * 1024 + 1, 65),
      },
    },
  });
  expect(oversized.status()).toBe(413);
  const after = (await (await page.request.get('/api/documents')).json())
    .documents.length;
  expect(after).toBe(before);
});

test('owner sharing, recipient editing, owner-only actions and unshared denial', async ({
  page,
  browser,
}) => {
  await login(page);
  const id = await create(page);
  await page
    .getByLabel('Document title', { exact: true })
    .fill('Shared working notes');
  await saved(page);
  await share(page);
  expect(
    (
      await mutate(page.request, 'post', `/api/documents/${id}/shares`, {
        userId: sam.id,
      })
    ).status(),
  ).toBe(200);
  const context = await browser.newContext();
  const recipient = await context.newPage();
  await login(recipient, 'Sam Taylor');
  await recipient
    .getByRole('link', { name: 'Shared with me', exact: true })
    .click();
  await recipient.getByRole('link', { name: /Shared working notes/ }).click();
  await expect(
    recipient.getByRole('button', { name: 'Share', exact: true }),
  ).toHaveCount(0);
  await expect(
    recipient.getByLabel('Document title', { exact: true }),
  ).toHaveAttribute('readonly', '');
  const doc = (
    await (await recipient.request.get(`/api/documents/${id}`)).json()
  ).document;
  expect(
    (
      await mutate(recipient.request, 'patch', `/api/documents/${id}`, {
        version: doc.version,
        title: 'Forbidden rename',
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await mutate(recipient.request, 'post', `/api/documents/${id}/shares`, {
        userId: jordan.id,
      })
    ).status(),
  ).toBe(403);
  await recipient
    .getByRole('textbox', { name: 'Document content' })
    .fill('Sam was here');
  await saved(recipient);
  await page.reload();
  await expect(
    page.getByRole('textbox', { name: 'Document content' }),
  ).toHaveText('Sam was here');
  await login(recipient, 'Jordan Lee');
  await recipient
    .getByRole('link', { name: 'Shared with me', exact: true })
    .click();
  await expect(
    recipient.getByRole('link', { name: /Shared working notes/ }),
  ).toHaveCount(0);
  expect((await recipient.request.get(`/api/documents/${id}`)).status()).toBe(
    404,
  );
  expect(
    (
      await mutate(recipient.request, 'patch', `/api/documents/${id}`, {
        version: 1,
        content: textToContent('No'),
      })
    ).status(),
  ).toBe(404);
  await recipient.goto(`/documents/${id}`);
  await expect(
    recipient.getByRole('heading', {
      name: 'This page isn’t in your workspace.',
    }),
  ).toBeVisible();
  await context.close();
});

test('failed saves preserve local content and retry successfully', async ({
  page,
}) => {
  await login(page);
  const id = await create(page);
  await page.route(`**/api/documents/${id}`, async (route) => {
    if (route.request().method() === 'PATCH') await route.abort('failed');
    else await route.continue();
  });
  const editor = page.getByRole('textbox', { name: 'Document content' });
  await editor.fill('Keep this draft');
  await expect(page.getByRole('alert', { name: 'Save error' })).toContainText(
    'could not reach',
    { ignoreCase: true },
  );
  await expect(editor).toHaveText('Keep this draft');
  await expect(
    page.getByRole('status').filter({ hasText: /^Saved$/ }),
  ).toHaveCount(0);
  await page.unroute(`**/api/documents/${id}`);
  await page.getByRole('button', { name: 'Retry save' }).click();
  await saved(page);
  await page.reload();
  await expect(editor).toHaveText('Keep this draft');
});

test('rapid edits during an in-flight save are serialized and persist the latest snapshot', async ({
  page,
}) => {
  await login(page);
  const id = await create(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let first = true;
  await page.route(`**/api/documents/${id}`, async (route) => {
    if (route.request().method() === 'PATCH' && first) {
      first = false;
      const response = await route.fetch();
      await gate;
      await route.fulfill({ response });
    } else await route.continue();
  });
  const editor = page.getByRole('textbox', { name: 'Document content' });
  await editor.fill('First snapshot');
  await expect(
    page.getByRole('status').filter({ hasText: /^Saving/ }),
  ).toBeVisible();
  await editor.fill('Latest snapshot');
  await expect(
    page.getByRole('status').filter({ hasText: /^Saved$/ }),
  ).toHaveCount(0);
  release();
  await saved(page);
  await page.reload();
  await expect(editor).toHaveText('Latest snapshot');
});

test('stale edits show a conflict and do not overwrite the first save', async ({
  page,
  browser,
}) => {
  await login(page);
  const id = await create(page);
  const context = await browser.newContext();
  const other = await context.newPage();
  await login(other);
  await other.goto(`/documents/${id}`);
  await expect(
    other.getByRole('textbox', { name: 'Document content' }),
  ).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Document content' })
    .fill('First writer');
  await saved(page);
  await other
    .getByRole('textbox', { name: 'Document content' })
    .fill('Unsaved local writer');
  await expect(other.getByRole('alert', { name: 'Save error' })).toContainText(
    'newer version',
  );
  await expect(
    other.getByRole('textbox', { name: 'Document content' }),
  ).toHaveText('Unsaved local writer');
  await page.reload();
  await expect(
    page.getByRole('textbox', { name: 'Document content' }),
  ).toHaveText('First writer');
  other.on('dialog', (dialog) => dialog.accept());
  await other.getByRole('button', { name: 'Reload latest' }).click();
  await expect(
    other.getByRole('textbox', { name: 'Document content' }),
  ).toHaveText('First writer');
  await context.close();
});

test('same-browser identity switching does not save an old draft as the new user', async ({
  page,
  context,
}) => {
  await login(page);
  const id = await create(page);
  const second = await context.newPage();
  await login(second, 'Jordan Lee');
  await page
    .getByRole('textbox', { name: 'Document content' })
    .fill('Original user draft');
  await expect(page.getByRole('alert', { name: 'Save error' })).toContainText(
    'profile changed',
  );
  await expect(
    page.getByRole('textbox', { name: 'Document content' }),
  ).toHaveText('Original user draft');
  expect((await second.request.get(`/api/documents/${id}`)).status()).toBe(404);
});

test('mutation origin and missing/tampered session are rejected', async ({
  request,
}) => {
  expect((await request.get('/api/documents')).status()).toBe(401);
  expect(
    (
      await request.post('/api/session', {
        data: { userId: alex.id },
        headers: { Origin: 'https://other.example' },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.get('/api/documents', {
        headers: { Cookie: 'folio_session=tampered' },
      })
    ).status(),
  ).toBe(401);
});

test('keyboard dialog access and narrow-screen editing remain usable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await create(page);
  await page
    .getByRole('textbox', { name: 'Document content' })
    .fill('Small screen, same ideas.');
  await page
    .getByRole('textbox', { name: 'Document content' })
    .press('ControlOrMeta+s');
  await saved(page);
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Share', exact: true }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('a local process restart preserves documents and sharing', async ({
  browser,
}) => {
  const server = isolatedServer(3108);
  const context = await browser.newContext({ baseURL: server.url });
  try {
    await server.start();
    const page = await context.newPage();
    await login(page);
    const id = await create(page);
    await page
      .getByRole('textbox', { name: 'Document content' })
      .fill('Survives a restart');
    await saved(page);
    await share(page);
    await server.stop();
    await server.start();
    await page.reload();
    await expect(
      page.getByRole('textbox', { name: 'Document content' }),
    ).toHaveText('Survives a restart');
    const recipients = await (
      await page.request.get(`/api/documents/${id}/shares`)
    ).json();
    expect(recipients.users.map((user: { id: string }) => user.id)).toContain(
      sam.id,
    );
  } finally {
    await context.close();
    await server.stop();
    server.cleanup();
  }
});

test('invalid titles block navigation and recover after an explicit retry', async ({
  page,
}) => {
  await login(page);
  const id = await create(page);
  await page.getByLabel('Document title', { exact: true }).fill('   ');
  await page.getByRole('button', { name: 'Back to documents' }).click();
  await expect(page.getByRole('alert', { name: 'Save error' })).toContainText(
    'Enter a title',
  );
  await expect(page).toHaveURL(new RegExp(id));
  await page
    .getByLabel('Document title', { exact: true })
    .fill('Recovered title');
  await page.getByRole('button', { name: 'Retry save' }).click();
  await saved(page);
  await page.getByRole('button', { name: 'Back to documents' }).click();
  await expect(
    page.getByRole('link', { name: /Recovered title/ }),
  ).toBeVisible();
});
