const { listAllBackups } = require('../lib/backup/list');

async function main() {
  try {
    const backups = await listAllBackups();
    console.log('--- Backup List ---');
    backups.forEach(b => {
      console.log(`${b.fileName}: ${b.status} (${b.filePath})`);
    });
  } catch (error) {
    console.error(error);
  }
}

main();
