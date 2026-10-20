import { test, expect } from '@playwright/test';
import { isolatedServer } from '../scripts/test-server';
import { alex, sam } from './helpers';

test('hosted startup preserves data and enforces HTTPS origin and cookies behind a proxy', async ({
  playwright,
}) => {
  const origin = 'https://folio.example';
  const server = isolatedServer(3111, { hosted: true, origin });
  const api = await playwright.request.newContext({ baseURL: server.url });
  try {
    await server.start();
    expect(await (await api.get('/api/health')).json()).toEqual({
      status: 'ok',
    });
    const denied = await api.post('/api/session', {
      headers: { Origin: 'https://other.example' },
      data: { userId: alex.id },
    });
    expect(denied.status()).toBe(403);
    const login = await api.post('/api/session', {
      headers: { Origin: origin },
      data: { userId: alex.id },
    });
    expect(login.status()).toBe(200);
    const cookie = login.headers()['set-cookie'];
    expect(cookie).toMatch(/; Secure/i);
    expect(cookie).toMatch(/; HttpOnly/i);
    const headers = { Origin: origin, Cookie: cookie!.split(';')[0]! };
    const created = await api.post('/api/documents', { headers });
    expect(created.status()).toBe(201);
    const { document } = await created.json();
    const grant = await api.post(`/api/documents/${document.id}/shares`, {
      headers,
      data: { userId: sam.id },
    });
    expect(grant.ok()).toBeTruthy();
    const update = await api.patch(`/api/documents/${document.id}`, {
      headers,
      data: {
        version: document.version,
        title: 'Hosted persistence',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Preserved on the volume' }],
            },
          ],
        },
      },
    });
    expect(update.ok()).toBeTruthy();
    await server.stop();
    await server.start();
    const reopened = await api.get(`/api/documents/${document.id}`, {
      headers,
    });
    expect(reopened.ok()).toBeTruthy();
    expect((await reopened.json()).document.title).toBe('Hosted persistence');
    const shares = await api.get(`/api/documents/${document.id}/shares`, {
      headers,
    });
    expect(
      (await shares.json()).users.map((user: { id: string }) => user.id),
    ).toContain(sam.id);
  } finally {
    await api.dispose();
    await server.stop();
    server.cleanup();
  }
});
