const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
 testDir: './tests/auth', timeout: 45000, expect: { timeout: 10000 },
 workers: 1, retries: 0,
 outputDir: 'test-results-auth',
 reporter: [['list'], ['html', { outputFolder: 'playwright-report-auth', open: 'never' }], ['json', { outputFile: 'test-results-auth/results.json' }]],
});
