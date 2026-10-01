const { defineConfig } = require('@playwright/test');
const fs = require('node:fs');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
module.exports = defineConfig({ testDir: './tests/e2e', testMatch: '*.spec.js', workers: 1, timeout: 90000, outputDir: 'test-results', use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure', screenshot: 'only-on-failure', launchOptions: fs.existsSync(chrome) ? { executablePath: chrome } : {} }, webServer: { command: 'node tests/e2e/server.js', url: 'http://127.0.0.1:5173', reuseExistingServer: false, timeout: 60000 } });
