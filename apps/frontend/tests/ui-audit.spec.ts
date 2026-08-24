import { test, expect } from '@playwright/test';

// Simple login helper – credentials read from env variables
async function login(page, role) {
  await page.goto('/');
  const email = process.env[`TEST_USER_${role.toUpperCase()}_EMAIL`] || `${role}@example.com`;
  const pwd = process.env[`TEST_USER_${role.toUpperCase()}_PWD`] || 'password';
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', pwd);
  await page.click('button[type="submit"]');
  // Wait for the "Logout" button to appear in the header to confirm login
  await expect(page.locator('text=Logout')).toBeVisible();
}

const routes = {
  patient: ['Dashboard', 'Find Doctor', 'Appointments', 'Notifications'],
  doctor: ['Dashboard', 'Patient Queue', 'Schedule'],
  admin: ['Dashboard', 'Manage Doctors', 'Leave Management', 'Notifications', 'Audit Log'],
};

for (const role of Object.keys(routes) as Array<keyof typeof routes>) {
  test.describe(`${role} UI audit`, () => {
    test.beforeEach(async ({ page }) => {
      await login(page, role);
    });
    for (const viewLabel of routes[role]) {
      test(`visit ${viewLabel}`, async ({ page }) => {
        // Navigate by clicking the sidebar button with the corresponding label
        await page.click(`nav button:has-text("${viewLabel}")`);
        await page.waitForLoadState('networkidle');
        
        // Basic UI sanity checks – existence of interactive elements
        const buttons = await page.$$('button');
        for (const btn of buttons) {
          try {
            await btn.hover({ timeout: 1000 });
            await btn.focus({ timeout: 1000 });
            await btn.dispatchEvent('mousedown');
            await btn.dispatchEvent('mouseup');
          } catch (e) {
             // ignore non-interactable buttons in tests
          }
        }
        
        // Form field checks – label association & required asterisk
        const inputs = await page.$$('input, textarea, select');
        for (const input of inputs) {
          const id = await input.getAttribute('id');
          if (id) {
            const label = await page.$(`label[for="${id}"]`);
            expect(label).not.toBeNull();
          }
          const required = await input.getAttribute('required');
          if (required) {
            const parent = await input.evaluateHandle(el => el.parentElement);
            const asterisk = await parent.$('span.required, *:has-text("*")');
            expect(asterisk).not.toBeNull();
          }
        }
        
        // Empty-state detection – look for data-empty-state attribute
        const emptyStates = await page.$$('[data-empty-state]');
        for (const el of emptyStates) {
          const txt = await el.textContent();
          expect(txt?.trim().length).toBeGreaterThan(0);
        }
      });
    }
  });
}
