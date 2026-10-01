const { test, expect } = require('@playwright/test');
test.beforeEach(async ({ request }) => { const response = await request.post('http://127.0.0.1:5050/__test/isolate-actors', { data: { label: require('node:crypto').randomUUID() } }); expect(response.status()).toBe(200); });
test('primary pages, authenticated commands, topology and responsive navigation work', async ({ page, request }) => {
 const errors = []; page.on('pageerror', error => errors.push(error.message));
 await page.goto('/');
 await page.getByLabel('Operations credential').fill('test-engineer-credential-with-at-least-32-characters');
 await page.getByRole('button', { name: 'Sign in', exact: true }).click();
 await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
 for (const path of ['incidents', 'engineering', 'actions', 'repository', 'agents', 'azure-foundry', 'knowledge', 'settings']) {
  await page.goto('/' + path);
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  await expect(page.locator('h1').first()).toBeVisible();
 }
 await page.goto('/agents');
 await expect(page.getByRole('region', { name: 'Live agent topology' })).toBeVisible();
 await expect(page.getByLabel('Operations token')).toHaveCount(0);
 await page.keyboard.press('Control+k');
 const dialog = page.getByRole('dialog', { name: 'Command palette' });
 await expect(dialog).toBeVisible();
 await page.getByRole('textbox', { name: 'Search commands', exact: true }).fill('knowledge');
 await page.keyboard.press('Enter'); await expect(page).toHaveURL(/\/knowledge$/);
 await page.keyboard.press('Control+k'); await expect(dialog).toBeVisible();
 await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
 await page.getByLabel('Title', { exact: true }).fill('Navigation source');
 await page.getByLabel('Text or Markdown').fill('# Recovery\nActual locally supplied document for timeout recovery.');
 await page.getByRole('button', { name: 'Index source', exact: true }).click();
 await expect(page.getByText(/Navigation source ·/)).toBeVisible();
 await page.getByLabel('Query', { exact: true }).fill('timeout recovery');
 await page.getByRole('button', { name: 'Search', exact: true }).click();
 await expect(page.getByText(/local_semantic score/).first()).toBeVisible();
 const created = [];
 for (const title of ['Palette incident alpha', 'Palette incident beta']) {
  const response = await request.post('http://127.0.0.1:5050/api/incidents', { headers: { Authorization: 'Bearer test-engineer-credential-with-at-least-32-characters', 'Idempotency-Key': require('node:crypto').randomUUID() }, data: { title, description: title, investigate: false } });
  expect(response.ok()).toBe(true); created.push(await response.json());
 }
 await page.goto(`/incidents/${created[0]._id}`);
 await expect(page.getByRole('heading', { name: 'Palette incident alpha', exact: true })).toBeVisible();
 await page.keyboard.press('Control+k');
 await page.getByRole('textbox', { name: 'Search commands', exact: true }).fill('Palette incident beta');
 await expect(dialog.getByRole('button', { name: /Palette incident beta/ })).toBeVisible();
 await page.keyboard.press('Enter');
 await expect(page).toHaveURL(new RegExp(created[1]._id));
 await expect(page.getByRole('heading', { name: 'Palette incident beta', exact: true })).toBeVisible();
 await page.goBack(); await expect(page.getByRole('heading', { name: 'Palette incident alpha', exact: true })).toBeVisible();
 for (const width of [1440, 1024, 768, 390]) {
  await page.setViewportSize({ width, height: 900 });
  for (const path of ['/', '/incidents', '/agents', '/knowledge', '/repository']) {
   await page.goto(path); await expect(page.locator('h1').first()).toBeVisible();
   const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
   expect(overflow, `Horizontal overflow at ${width} on ${path}`).toBe(false);
  }
 }
 expect(errors).toEqual([]);
});
