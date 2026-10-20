import { test as base, expect, type Page } from '@playwright/test';
export const test = base.extend<{ browserErrors: string[] }>({
  browserErrors: [
    async ({ page, context }, use) => {
      const errors: string[] = [];
      function observe(target: Page) {
        target.on('pageerror', (error) => errors.push(error.message));
        target.on('console', (message) => {
          if (
            message.type() === 'error' &&
            /hydration|Minified React error|uncaught/i.test(message.text())
          )
            errors.push(message.text());
        });
        target.on('response', (response) => {
          if (response.status() >= 500)
            errors.push(
              `Server error ${response.status()}: ${new URL(response.url()).pathname}`,
            );
        });
      }
      observe(page);
      context.on('page', observe);
      await use(errors);
      expect(
        errors,
        'Unexpected browser runtime, hydration, or server errors',
      ).toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };
