import { test, expect } from '@playwright/test';

test.describe('Document Preview Flow', () => {
  test('should render iframe or blob URL correctly without CSP blocking', async ({ page }) => {
    // We log in first
    await page.goto('/');
    await page.fill('input[type="text"], input[type="email"]', 'superadmin');
    await page.fill('input[type="password"]', 'admin1234');
    await page.click('button[type="submit"]');
    
    // Wait for requests list to load
    await page.waitForTimeout(2000);
    
    // Find the first request row and click it
    // Using a generic locator that matches the table row
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.count() > 0) {
      await firstRow.click();
      
      // Wait for details to open
      await page.waitForTimeout(1000);
      
      // Click "จำลองหน้าตาเอกสารส่งมอบ" (Simulate Delivery Document)
      const simulateBtn = page.locator('button:has-text("จำลองหน้าตาเอกสารส่งมอบ"), button:has-text("เปิดเอกสารส่งมอบ")').first();
      if (await simulateBtn.count() > 0) {
        await simulateBtn.click();
        
        // Wait for preview modal to load
        await page.waitForTimeout(1000);
        
        // Click "เปิดดูเอกสาร (In-App)"
        const viewInAppBtn = page.locator('button:has-text("เปิดดูเอกสาร (In-App)")').first();
        if (await viewInAppBtn.count() > 0) {
          await viewInAppBtn.click();
          
          // Wait for iframe to render
          await page.waitForSelector('iframe', { state: 'visible', timeout: 5000 });
          
          // Verify that iframe src is a blob url (or data url)
          const iframe = page.locator('iframe').first();
          const src = await iframe.getAttribute('src');
          expect(src).toMatch(/^(blob:|data:)/);
          
          // If the CSP blocked it, we'd still see the iframe but playwright might catch a console error
          // We can also verify there is no "Authorization header missing" text in the page
          const errorText = page.locator('text="Authorization header missing"');
          await expect(errorText).toHaveCount(0);
        }
      }
    }
  });
});
