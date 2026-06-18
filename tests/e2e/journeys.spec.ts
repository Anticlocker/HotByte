import { test, expect } from '@playwright/test';

test.describe('Journey — Admin login page', () => {
  test('admin login page has username + password fields', async ({ page }) => {
    await page.goto('/admin/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await expect(page.locator('input[placeholder="ravi"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[placeholder="••••••••"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button[type="submit"]').or(page.getByRole('button', { name: /login/i })).first()).toBeVisible({ timeout: 5000 });
  });

  test('super-admin login page has username + password fields', async ({ page }) => {
    await page.goto('/super-admin/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await expect(page.locator('input[placeholder="Enter username"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[placeholder="••••••••"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button[type="submit"]').or(page.getByRole('button', { name: /login|terminal/i })).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Journey — Customer login page', () => {
  test('login page loads with Google OAuth section', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    // The page should render the login card with some text content
    await expect(page.getByText(/login|sign.?in|google|continue/i).first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Journey — Navigation', () => {
  test('navigate to /about page directly', async ({ page }) => {
    const response = await page.goto('/about', { waitUntil: 'domcontentloaded', timeout: 20000 });
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/About HotByte/i);
  });

  test('navigate to /contact page directly', async ({ page }) => {
    const response = await page.goto('/contact', { waitUntil: 'domcontentloaded', timeout: 20000 });
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Contact HotByte/i);
  });

  test('home page loads with static content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Journey — 404 behavior', () => {
  test('unknown route returns 404', async ({ page }) => {
    const response = await page.goto('/this-does-not-exist-12345', { waitUntil: 'domcontentloaded', timeout: 20000 });
    expect(response?.status()).toBe(404);
  });
});
