import { expect, test, type Page } from '@playwright/test';
import { createGame } from '../../src/engine/setup';
import { step } from '../../src/engine/step';
import type { GameState } from '../../src/engine/types';

/** Dalen's last morning, hour 1, with the trees falling where we can see it – loaded as a saved game. */
function morning(): GameState {
  let s = step(createGame(4), { type: 'swear', verses: ['manen'] }).state;
  s.journey.at = 'granbacken';
  s.journey.visited.push('granbacken');
  s.clock = 'day';
  s = step(s, { type: 'travel', to: 'asen' }).state;
  s.fellPlan[0] = 'granOst';
  s.feint = [];
  return s;
}

async function load(page: Page, s: GameState) {
  await page.goto('/');
  await page.evaluate((st) => localStorage.setItem('ingen-lamnas-kvar/save-v1', st), JSON.stringify(s));
  await page.reload();
  await page.click('[data-act="continue"]');
  const ok = page.getByRole('button', { name: 'Jag förstår' });
  if (await ok.count()) await ok.click();
}

test('a led animal walks to its new zone; when the hour goes, the blows land on the board before it unlocks', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await load(page, morning());

  // Lead one animal up: its token walks there.
  const mover = page.locator('.token.can-move').first();
  const id = await mover.getAttribute('data-animal');
  await mover.dispatchEvent('click');
  await page.locator('.zone.target[data-zone="hygget"]').dispatchEvent('click');
  const token = page.locator(`.token[data-animal="${id}"]`);
  await expect(token).toHaveClass(/walking/);

  // Let the hour go: the felling lands on its zone while the board waits.
  await page.getByRole('button', { name: 'Låt timmen gå' }).click();
  await expect(page.locator('.sweeps .blow.blow-fell')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Låt timmen gå' })).toBeDisabled();
  await expect(page.locator('.sweeps .blow')).toHaveCount(0, { timeout: 5000 });
  expect(errors).toEqual([]);
});

test.describe('with reduced motion', () => {
  test('the hour still plays out, the blow a still highlight', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await load(page, morning());
    await page.getByRole('button', { name: 'Låt timmen gå' }).click();
    const blow = page.locator('.sweeps .blow');
    await expect(blow).toHaveCount(1);
    await expect(blow.locator('i').first()).toBeHidden();
    await expect(blow).toHaveCount(0, { timeout: 5000 });
  });
});
