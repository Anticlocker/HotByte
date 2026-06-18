import { test } from '@playwright/test';

const ROUTES = [
  '/',
  '/about',
  '/contact',
  '/login',
  '/privacy-policy',
  '/refund-policy',
  '/terms-and-conditions',
  '/admin/login',
  '/super-admin/login',
  '/onboarding',
  '/profile',
];

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

test.describe('Visual — full-page screenshots', () => {
  for (const route of ROUTES) {
    for (const viewport of VIEWPORTS) {
      test(`${route} @ ${viewport.name}`, async ({ page }) => {
        test.setTimeout(120000);

        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);
        await page.waitForSelector('body', { timeout: 10000 });

        const sanitizedRoute = route === '/' ? 'home' : route.replace(/\//g, '-').replace(/^-/, '');
        await page.screenshot({
          path: `test-results/screenshots/${sanitizedRoute}__${viewport.name}.png`,
          fullPage: true,
        });
      });
    }
  }
});
