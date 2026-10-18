import { expect, test, type Page } from '@playwright/test';

/** Lead whoever can move toward the goal (the topmost lit zone), a few times per hour. Lure the dogs once. */
async function leadForward(page: Page, seen: Set<string>) {
  for (let n = 0; n < 3; n++) {
    const movers = page.locator('.token.can-move');
    if (!(await movers.count())) return;
    await movers.first().dispatchEvent('click'); // crowded zones overlap; the tap itself is what we test
    const lure = page.getByRole('button', { name: /Locka hundarna/ });
    if (!seen.has('lure') && (await lure.count()) && (await lure.isEnabled())) {
      await lure.click();
      seen.add('lure');
    }
    const zones = page.locator('.zone.target');
    const count = await zones.count();
    if (!count) {
      await page.keyboard.press('Escape');
      return;
    }
    let best = 0;
    let top = Infinity;
    for (let i = 0; i < count; i++) {
      const box = await zones.nth(i).boundingBox();
      if (box && box.y < top) { top = box.y; best = i; }
    }
    await zones.nth(best).dispatchEvent('click');
    if (await page.locator('.end-screen, .map-screen, [data-act="lm-letgo"]').count()) return;
  }
}

for (const route of [
  { to: 'garden', scene: 'farm' },
  { to: 'an', scene: 'river' },
]) test(`a whole run: oath, map, road, campfire, ${route.scene}, onward`, async ({ page }) => {
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
  await verses.nth(1).click();
  await verses.nth(0).click(); // picking another replaces it: only one oath
  await expect(page.locator('.verse-card.chosen')).toHaveCount(1);
  await page.getByRole('button', { name: /Svär eden/ }).click();

  // The map: the glen, and the road ahead in fog.
  await expect(page.locator('.map-screen')).toBeVisible();
  // The road comes at night; we could wait for the day instead, for one hope.
  await expect(page.locator('.onward .btn').first()).toHaveText(/i natt/);
  await expect(page.getByRole('button', { name: /Vänta till dagen/ })).toBeEnabled();
  await page.locator('.onward .btn').first().click();
  await expect(page.locator('.token')).toHaveCount(6);

  // The first time on the road, the guide opens by itself; the Guide button brings it back.
  await expect(page.locator('.guide-modal')).toBeVisible();
  await expect(page.locator('.guide-modal .zone-sketch .sk-zone')).toHaveCount(6);
  await page.getByRole('button', { name: 'Jag förstår' }).click();
  await expect(page.locator('.guide-modal')).toHaveCount(0);
  await page.getByRole('button', { name: 'Guide', exact: true }).click();
  await expect(page.locator('#guide-title')).toHaveText('Så går vi över vägen');
  await page.keyboard.press('Escape');
  await expect(page.locator('.guide-modal')).toHaveCount(0);

  // The deck checker shows every card, grouped by animal.
  await page.getByRole('button', { name: 'Hela leken' }).click();
  await expect(page.locator('.deck-animal')).toHaveCount(6);
  await expect(page.locator('.deck .card.mini')).toHaveCount(18);
  await page.getByRole('button', { name: 'Stäng' }).click();

  // Tap an animal that can move, then a lit zone.
  await page.locator('.token.can-move').first().click();
  await expect(page.locator('.inspect')).toBeVisible();
  await page.locator('.zone.target').first().click({ position: { x: 8, y: 8 } });

  const seen = new Set<string>();
  const deadline = Date.now() + 75_000;
  while (Date.now() < deadline) {
    if (await page.locator('.end-screen').count()) break;
    if (await page.locator('[data-act="lm-letgo"]').count()) {
      await page.locator('[data-act="lm-letgo"]').click();
      continue;
    }
    if (await page.locator('.guide-modal').count()) {
      if (await page.locator(`.scene.${route.scene}`).count()) seen.add('area guide');
      await page.getByRole('button', { name: 'Jag förstår' }).click();
      continue;
    }
    if (await page.locator('.fire-screen').count()) {
      seen.add('fire');
      await page.getByRole('button', { name: 'Låt natten gå' }).click();
      continue;
    }
    if (await page.locator('.map-screen').count()) {
      seen.add('map');
      // At the fork, the voices speak and we take this test's way.
      const fork = page.locator(`.onward .btn.primary[data-to="${route.to}"]`);
      if (await fork.count()) {
        await expect(page.locator('.voice')).toHaveCount(2);
        await fork.click();
      } else await page.locator('.onward .btn').first().click();
      continue;
    }
    const end = page.getByRole('button', { name: 'Låt timmen gå' });
    if (!(await end.isEnabled())) {
      await page.waitForTimeout(200);
      continue;
    }
    if (await page.locator(`.scene.${route.scene}`).count()) seen.add('area');
    await leadForward(page, seen);
    if (await page.locator('.end-screen, .map-screen, [data-act="lm-letgo"]').count()) continue;
    if (await end.isEnabled()) await end.click();
  }
  await expect(page.locator('.end-screen')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.end-screen h2')).toHaveText(/Åkrarna|Eden föll/);
  if ((await page.locator('.end-screen h2').textContent()) === 'Åkrarna') expect([...seen]).toEqual(expect.arrayContaining(['area', 'area guide', 'fire', 'map']));
  expect(errors).toEqual([]);
});
