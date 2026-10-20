import { expect, type Page, type APIRequestContext } from '@playwright/test';
import { DEMO_USERS } from '../db/seed';
export const [alex, sam, jordan] = DEMO_USERS;
export async function login(page: Page, name = 'Alex Morgan') {
  await page.goto('/?switch=1');
  await page.getByRole('radio', { name: new RegExp(name) }).check();
  await page.getByRole('button', { name: 'Enter workspace' }).click();
  await expect(
    page.getByRole('heading', { name: 'Your words. Your workspace.' }),
  ).toBeVisible();
}
export async function create(page: Page) {
  await page.getByRole('button', { name: 'New document', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Document content' }),
  ).toBeVisible();
  return page.url().split('/').at(-1)!;
}
export async function saved(page: Page) {
  await expect(
    page.getByRole('status').filter({ hasText: /^Saved$/ }),
  ).toBeVisible();
}
export async function share(page: Page) {
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await page.getByLabel('Share with a demo user').selectOption(sam.id);
  await page.getByRole('button', { name: 'Grant access' }).click();
  await expect(
    page.getByText('Access granted.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close sharing' }).click();
}
export async function mutate(
  request: APIRequestContext,
  method: 'post' | 'patch',
  path: string,
  data?: unknown,
  origin = 'http://127.0.0.1:3107',
) {
  return request[method](path, { data, headers: { Origin: origin } });
}
