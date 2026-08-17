import { test, expect } from '@playwright/test';

test.describe('Intake Flow', () => {
  test('should allow Intake to review documents and pass completeness check', async ({ page }) => {
    await page.goto('/');
    
    // Login as Intake or Admin
    await page.fill('input[type="text"], input[type="email"]', 'superadmin');
    await page.fill('input[type="password"]', 'admin1234');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(2000);
    
    // Check if there's any 'Submitted' request
    const submittedRow = page.locator('table tbody tr:has-text("Submitted")').first();
    if (await submittedRow.count() > 0) {
      await submittedRow.click();
      
      // Wait for modal
      await page.waitForTimeout(1000);
      
      // Check for the "เอกสารครบถ้วน" button (Documents Verified)
      const verifyBtn = page.locator('button:has-text("เอกสารครบถ้วน")').first();
      if (await verifyBtn.count() > 0) {
        // If it exists, click it
        await verifyBtn.click();
        
        // Wait for confirmation dialog and confirm
        const confirmBtn = page.locator('.swal2-confirm').first();
        if (await confirmBtn.count() > 0) {
          await confirmBtn.click();
        }
        
        // Verify state changed (toast or reload)
        await page.waitForTimeout(2000);
        
        // Check if the status badge is updated
        const statusBadge = page.locator('.rounded-full:has-text("Documents Verified")').first();
        await expect(statusBadge).toBeVisible();
      }
    }
  });
});
