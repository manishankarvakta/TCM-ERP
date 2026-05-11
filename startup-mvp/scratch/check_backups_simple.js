const fs = require('fs/promises');
const path = require('path');
require('dotenv').config();

async function checkBackups() {
  const BACKUP_ROOT_DIR = process.env.BACKUP_ROOT_DIR || path.join(process.cwd(), 'backups');
  console.log('Scanning BACKUP_ROOT_DIR:', BACKUP_ROOT_DIR);

  const types = ['database', 'files', 'full'];
  for (const type of types) {
    const dir = path.join(BACKUP_ROOT_DIR, type);
    try {
      const files = await fs.readdir(dir);
      console.log(`- ${type}: ${files.length} files found`);
      files.forEach(f => console.log(`  [OK] ${f}`));
    } catch (e) {
      console.log(`- ${type}: Directory not found or unreadable`);
    }
  }
}

checkBackups();
