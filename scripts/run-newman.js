// Runs the DMoney collection with Newman and writes CLI + HTML + JSON reports to ./Reports.
// Configuration comes from .env (see .env.example); anything unset falls back to the
// values in postman/DMoney-Local.postman_environment.json.
const path = require('path');
const fs = require('fs');
const newman = require('newman');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const root = path.join(__dirname, '..');
const reportsDir = path.join(root, 'Reports');
fs.mkdirSync(reportsDir, { recursive: true });

// .env key -> Postman environment variable
const overrides = {
  BASE_URL: 'base_url',
  PARTNER_KEY: 'partner_key',
  DEFAULT_OTP: 'default_otp',
  ADMIN_EMAIL: 'admin_email',
  ADMIN_PASSWORD: 'admin_password',
  SYSTEM_EMAIL: 'system_email',
  SYSTEM_PASSWORD: 'system_password',
  USER_PASSWORD: 'user_password',
};
const envVar = Object.entries(overrides)
  .filter(([envKey]) => process.env[envKey] !== undefined && process.env[envKey] !== '')
  .map(([envKey, key]) => ({ key, value: process.env[envKey] }));

newman.run(
  {
    collection: path.join(root, 'postman', 'DMoney-E2E.postman_collection.json'),
    environment: path.join(root, 'postman', 'DMoney-Local.postman_environment.json'),
    envVar,
    reporters: ['cli', 'htmlextra', 'json'],
    reporter: {
      htmlextra: {
        export: path.join(reportsDir, 'newman-report.html'),
        title: 'DMoney - End-to-End Money Flow',
        browserTitle: 'DMoney Newman Report',
        showOnlyFails: false,
        logs: false,
      },
      json: { export: path.join(reportsDir, 'newman-report.json') },
    },
    timeoutRequest: 15000,
  },
  (err, summary) => {
    if (err) {
      console.error('Newman failed to run:', err.message);
      process.exit(2);
    }
    const failures = summary.run.failures.length;
    console.log(`\nReports written to ${reportsDir}`);
    process.exit(failures ? 1 : 0);
  }
);
