import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  retries: 1,
  reporter: [['list'], ['html', { outputFolder: 'ui-audit-report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:8500',
    headless: true,
    ignoreHTTPSErrors: true,
    video: 'on-first-retry',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 900 } } },
    { name: 'mobile', use: { ...devices['iPhone 12'] } },
    { name: 'mobileSmall', use: { viewport: { width: 375, height: 667 } } },
  ],
});

