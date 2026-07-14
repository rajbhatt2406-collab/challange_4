import { test, expect } from '@playwright/test';

test.describe('PulseOps Stadium CommandCenter E2E flows', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage before each test
    await page.goto('/');
  });

  test('Flow 1: Fan asks wayfinding concierge and sees route card instructions', async ({ page }) => {
    // 1. Locate Chat Input
    const chatInput = page.getByLabel('Concierge query input');
    await expect(chatInput).toBeVisible();

    // 2. Type wayfinding question and send
    await chatInput.fill('How do I get to North Restrooms from here?');
    await page.getByLabel('Send query').click();

    // 3. Verify route path instructions card renders node points
    const pathInstructionsHeader = page.getByText('Path Instructions');
    await expect(pathInstructionsHeader).toBeVisible();

    // Verify it computes routing (should list Gate A since start node is Gate A by default)
    const gateLabel = page.locator('ol.relative >> text=Gate A (North Entrance)');
    await expect(gateLabel).toBeVisible();
  });

  test('Flow 2: Staff dispatches an incident and reviews triage logs', async ({ page }) => {
    // 1. Locate triage text box
    const triageBox = page.getByPlaceholder(/Describe incident/i);
    await expect(triageBox).toBeVisible();

    // 2. Fill in description
    await triageBox.fill('Water spill and hazard on level 2 escalators.');
    
    // 3. Submit Form
    await page.getByRole('button', { name: /dispatch agent/i }).click();

    // 4. Verify the success message/dispatch suggestion logs correctly
    const successBanner = page.locator('text=Incident triaged successfully');
    await expect(successBanner).toBeVisible();

    // 5. Verify it appears in the historical operations log at the bottom
    const logItem = page.locator('text=Water spill and hazard on level 2 escalators');
    await expect(logItem).toBeVisible();
  });

  test('Flow 3: Accessibility mode toggles switch DOM styles and classes', async ({ page }) => {
    const htmlNode = page.locator('html');

    // 1. Verify default contrast is off
    await expect(htmlNode).not.toHaveClass(/high-contrast/);

    // 2. Click High Contrast toggle
    await page.getByRole('button', { name: /set contrast to high/i }).click();
    
    // 3. Verify html class changes to high-contrast
    await expect(htmlNode).toHaveClass(/high-contrast/);

    // 4. Click Font Scale Large option
    await page.getByRole('button', { name: /set font scale to large/i }).click();
    await expect(htmlNode).toHaveClass(/font-scale-lg/);

    // 5. Click Font Scale Extra-Large option
    await page.getByRole('button', { name: /set font scale to xlarge/i }).click();
    await expect(htmlNode).toHaveClass(/font-scale-xl/);
  });

  test('Flow 4: Validation error handles invalid input and blocks dispatch', async ({ page }) => {
    // 1. Locate triage text box and input short text
    const triageBox = page.getByPlaceholder(/Describe incident/i);
    await triageBox.fill('Help'); // Under 5 characters

    // 2. Locate the submit button
    const submitBtn = page.getByRole('button', { name: /dispatch agent/i });
    
    // 3. Verify the submit button is disabled
    await expect(submitBtn).toBeDisabled();

    // 4. Verify validation character indicator displays the warning count
    const labelText = page.locator('text=Characters typed: 4 (Min 5)');
    await expect(labelText).toBeVisible();
  });

});
