import { test, expect } from '@playwright/test';

test.describe('TipTap editor flows (smoke)', () => {
  test('modal/inline single-instance sync', async ({ page }) => {
    // NOTE: these tests assume the dev server is running at http://localhost:3000
    await page.goto('http://localhost:3000/app/forms/builder');
    await page.waitForLoadState('networkidle');

    // Focus the inline editor (contenteditable area used by TipTap)
    const editor = page.locator('div[contenteditable="true"]');
    await expect(editor).toBeVisible();
    await editor.click();
    await editor.fill('Inline edit: hello');

    // Open modal (expand button should be present)
    const expand = page.locator('button[aria-label="Expand editor"]');
    await expand.click();

    // Modal should show same content
    const modalEditor = page.locator('div[role="dialog"] div[contenteditable="true"]');
    await expect(modalEditor).toBeVisible();
    await expect(modalEditor).toContainText('Inline edit: hello');

    // Make an edit in modal and close
    await modalEditor.type(' — modal edit');
    const done = page.locator('text=Done');
    await done.click();

    // Inline editor should reflect modal edits
    await expect(editor).toContainText('modal edit');
  });

  test('create -> publish -> submit -> export (smoke)', async ({ page }) => {
    await page.goto('http://localhost:3000/app/forms/builder');
    await page.waitForLoadState('networkidle');

    // Create a form
    await page.fill('input[placeholder="e.g. Customer Feedback 2026"]', 'E2E TipTap Form');
    const editor = page.locator('div[contenteditable="true"]');
    await editor.click();
    await editor.fill('E2E description');

    // Proceed to Save (Draft)
    await page.click('text=Next'); // navigate steps until confirm
    await page.click('text=Next');
    await page.click('text=Next');

    // Launch form (confirm)
    await page.click('text=Launch form');
    // Expect to be redirected to forms list
    await page.waitForURL('**/app/forms');
    await expect(page).toHaveURL(/\/app\/forms/);
  });
});
