import { test, expect } from '@playwright/test';

const PUBLIC_ROUTES: { path: string; title?: RegExp; status?: number }[] = [
  { path: '/', title: /HotByte.*Digital Menu/i },
  { path: '/about', title: /About HotByte/i },
  { path: '/contact', title: /Contact HotByte/i },
  { path: '/login', title: /HotByte.*Digital Menu/i },
  { path: '/privacy-policy', title: /Privacy Policy/i },
  { path: '/refund-policy', title: /Refund Policy/i },
  { path: '/terms-and-conditions', title: /Terms.*Conditions/i },
  { path: '/admin/login', title: /HotByte.*Digital Menu/i },
  { path: '/super-admin/login', title: /HotByte.*Digital Menu/i },
  { path: '/onboarding', title: /HotByte.*Digital Menu/i },
  { path: '/profile', title: /HotByte.*Digital Menu/i },
];

test.describe('Smoke — public routes load successfully', () => {
  for (const { path, title } of PUBLIC_ROUTES) {
    test(`${path} returns 200 and loads without console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      const response = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 });
      expect(response?.status()).toBe(200);

      if (title) {
        await expect(page).toHaveTitle(title, { timeout: 10000 });
      }

      expect(errors).toHaveLength(0);
    });
  }
});
