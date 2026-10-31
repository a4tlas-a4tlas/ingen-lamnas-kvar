import { expect, test } from '@playwright/test';

/** The sound follows the game: read its trace (open with ?debug) as we go from the title to the first road. */
test('the sound follows us: the oath, the map, the road; the music can be turned off on its own', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?debug');
  await page.getByRole('button', { name: 'Börja vandringen' }).click();
  await page.locator('.cast-option[data-cast="dalensSista"] .btn').click();
  await page.locator('.verse-card').first().click();
  await page.getByRole('button', { name: /Svär eden/ }).click();
  await expect(page.locator('.map-screen')).toBeVisible();
  await page.locator('.onward .btn').first().click();
  await expect(page.locator('.token').first()).toBeVisible();

  const trace = () => page.evaluate(() => (window as unknown as { ilkSound: { trace: string[] } }).ilkSound.trace);
  await expect.poll(async () => (await trace()).filter((x) => x.startsWith('scene:')).map((x) => x.split(':')[1])).toEqual(expect.arrayContaining(['oath', 'map', 'danger']));
  expect(await trace()).toContain('travel');

  await page.getByRole('button', { name: 'Jag förstår' }).click();
  const music = page.getByRole('button', { name: /Musik/ }).first();
  await expect(music).toHaveText('Musik på');
  await music.click();
  await expect(page.getByRole('button', { name: /Musik/ }).first()).toHaveText('Musik av');
  expect(await page.evaluate(() => localStorage.getItem('ingen-lamnas-kvar/music'))).toBe('off');
  expect(errors).toEqual([]);
});
