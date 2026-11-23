/**
 * Reset the demo: deletes everything the app saved so the next start loads the built-in seed data again.
 *   npm run reset-data
 * Removes: data/db (all saved records), private-uploads (receipts + requirement documents), logs.
 * Keeps:   uploads (the demo site photos) and your source code.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const targets = [process.env.DATA_DIR || path.join(root, 'data', 'db'), path.join(root, 'private-uploads'), path.join(root, 'logs')];

for (const t of targets) {
  if (fs.existsSync(t)) {
    fs.rmSync(t, { recursive: true, force: true });
    console.log('removed', path.relative(root, t) || t);
  }
}
console.log('\nDemo data reset. Start the backend to load the seed accounts and sample projects again.');
