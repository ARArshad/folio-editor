import { mkdirSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';
import { create, login } from './helpers';
test('main screens and share dialog have no serious accessibility violations', async ({
  page,
}) => {
  async function audit() {
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      result.violations.filter((item) =>
        ['critical', 'serious'].includes(item.impact ?? ''),
      ),
      'Accessibility violations',
    ).toEqual([]);
  }
  mkdirSync('artifacts', { recursive: true });
  await page.goto('/?switch=1');
  await page.screenshot({ path: 'artifacts/welcome.png', fullPage: true });
  await audit();
  await login(page);
  await page.screenshot({ path: 'artifacts/dashboard.png', fullPage: true });
  await audit();
  await create(page);
  await page.screenshot({ path: 'artifacts/editor.png', fullPage: true });
  await audit();
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await audit();
});
