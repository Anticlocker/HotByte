import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const A11Y_ROUTES = [
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

const EXCLUDED_RULES = ['color-contrast'];

test.describe('Accessibility — no critical violations', () => {
  for (const route of A11Y_ROUTES) {
    test(`${route} — passes aXe core`, async ({ page }) => {
      test.setTimeout(60000);

      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
      await page.waitForSelector('body', { timeout: 15000 });

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
        .disableRules(EXCLUDED_RULES)
        .analyze();

      const critical = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical'
      );

      expect(critical).toEqual([]);
    });
  }
});
