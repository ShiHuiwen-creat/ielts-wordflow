import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

async function onboard(page: Page) {
  await page.goto('/ielts-wordflow/');
  await page.getByRole('radio', { name: '每天 10 个' }).check();
  await page.getByRole('button', { name: '开始学习' }).click();
  await expect(page.getByRole('heading', { name: '今日学习' })).toBeVisible();
}

test('restores a direct Pages route with its pathname, query, and hash', async ({ page }) => {
  const fallbackResponses: string[] = [];
  page.on('response', (response) => {
    if (response.status() === 404) {
      fallbackResponses.push(response.url());
    }
  });

  await page.goto('/ielts-wordflow/vocabulary?status=all#library');

  await expect(page).toHaveURL(/\/ielts-wordflow\/vocabulary\?status=all#library$/);
  expect(fallbackResponses).toContain(
    'http://127.0.0.1:4173/ielts-wordflow/vocabulary?status=all',
  );
  await page.getByRole('radio', { name: '每天 10 个' }).check();
  await page.getByRole('button', { name: '开始学习' }).click();
  await expect(page.getByRole('heading', { name: '词库' })).toBeVisible();
});

test('onboards, studies one word, and keeps progress after reload', async ({ page }) => {
  await onboard(page);
  await page.getByRole('link', { name: '开始今日学习' }).click();
  await page.getByRole('button', { name: '查看答案' }).click();
  await page.getByRole('button', { name: '认识', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'accurate' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'accurate' })).toBeVisible();
  await page.getByRole('link', { name: '今日' }).click();
  await expect(page.getByText('今日已学习 1')).toBeVisible();
});

test('reloads, browses bundled vocabulary, and records study while offline', async ({
  context,
  page,
}) => {
  await onboard(page);

  await page.goto('/ielts-wordflow/vocabulary');
  await expect(page.getByRole('heading', { name: '词库' })).toBeVisible();
  await expect(page.getByText('找到 300 个单词')).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);

  const failedRequests: string[] = [];
  page.on('requestfailed', (request) => failedRequests.push(request.url()));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: '词库' })).toBeVisible();
  await page.locator('.vocabulary-row').first().click();
  await expect(page.getByText('词条详情')).toBeVisible();

  await page.getByRole('link', { name: '学习' }).click();
  await page.getByRole('button', { name: '查看答案' }).click();
  await page.getByRole('button', { name: '认识', exact: true }).click();
  await page.getByRole('link', { name: '今日' }).click();
  await expect(page.getByText('今日已学习 1')).toBeVisible();
  expect(failedRequests).toEqual([]);
});
