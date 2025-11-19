const { test, expect } = require('@playwright/test');

const mockApps = {
  success: true,
  data: [
    {
      id: 'aaa',
      name: 'Aurora Vault',
      package_id: 'vault.aurora',
      category: 'security',
      developer: 'Aurora Labs',
      truth_rating: 4.8,
      download_count: 120000,
      icon_url: '',
      is_verified: true
    },
    {
      id: 'bbb',
      name: 'Civic Connect',
      package_id: 'civic.connect',
      category: 'civic',
      developer: 'Open Democracy',
      truth_rating: 4.2,
      download_count: 54000,
      icon_url: '',
      is_verified: true
    }
  ]
};

test('discover tab renders cards after search', async ({ page }) => {
  await page.route('**/api/v1/apps/trending**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockApps)
    });
  });

  await page.goto('/');

  await page.fill('input[placeholder="Search by app, dev, or signal keyword..."]', 'au');
  await page.waitForTimeout(700);

  await expect(page.getByText('Aurora Vault')).toBeVisible();
  await expect(page.getByText('Civic Connect')).toBeVisible();
});
