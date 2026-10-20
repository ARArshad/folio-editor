import { expect, test } from './fixtures';
import { create, login, saved, share } from './helpers';
test('create, format, save, reload and share on this browser', async ({
  page,
}) => {
  await login(page);
  await create(page);
  const editor = page.getByRole('textbox', { name: 'Document content' });
  await editor.fill('A shared idea');
  await editor.press('ControlOrMeta+a');
  await page.getByRole('button', { name: 'Bold', exact: true }).click();
  await saved(page);
  await page.reload();
  await expect(editor.locator('strong')).toHaveText('A shared idea');
  await share(page);
});
