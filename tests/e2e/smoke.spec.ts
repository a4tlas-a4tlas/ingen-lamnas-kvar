import { expect, test } from '@playwright/test';

test('swear the oath and live through the night', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('fonts.g')) errors.push(m.text());
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Ingen lämnas kvar' })).toBeVisible();
  await page.getByRole('button', { name: 'Börja vandringen' }).click();

  const verses = page.locator('.verse-card');
  await expect(verses).toHaveCount(6);
  for (let i = 0; i < 3; i++) await verses.nth(i).click();
  await page.getByRole('button', { name: 'Svär eden (3/3)' }).click();
  await expect(page.locator('.token')).toHaveCount(6);

  // Lead one animal, then let the hours pass, letting go whenever asked.
  // Tap an animal that can move, then a lit zone.
  await page.locator('.token.can-move').first().click();
  await expect(page.locator('.inspect')).toBeVisible();
  await page.locator('.zone.target').first().click({ position: { x: 8, y: 8 } });

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await page.locator('.end').count()) break;
    if (await page.locator('[data-act="lm-letgo"]').count()) {
      await page.locator('[data-act="lm-letgo"]').click();
      continue;
    }
    const end = page.getByRole('button', { name: 'Låt timmen gå' });
    if (await end.isEnabled()) await end.click();
    else await page.waitForTimeout(200);
  }
  await expect(page.locator('.end')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#end-title')).toHaveText(/Gryning|Eden föll/);
  expect(errors).toEqual([]);
});
