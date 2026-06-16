import { test, expect } from './fixtures';

test.describe('navigating app', () => {
  test('app root (About) page renders successfully', async ({ gotoPage, page }) => {
    await gotoPage('/');
    // Scope to our container test id to avoid matching the PluginPage wrapper too.
    await expect(page.getByTestId('data-testid home-container')).toBeVisible();
    await expect(page.getByText(/usage and cost analytics/i).first()).toBeVisible();
  });
});
