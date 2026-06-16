import { test, expect } from './fixtures';

test.describe('navigating app', () => {
  test('app root (About) page renders successfully', async ({ gotoPage, page }) => {
    await gotoPage('/');
    await expect(page.getByText(/usage and cost analytics/i)).toBeVisible();
  });
});
