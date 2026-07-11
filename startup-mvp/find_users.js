const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5439/startup_mvp?schema=public'
  });
  
  await client.connect();
  
  const tables = [
    { table: 'Lead', col: 'ownerId' },
    { table: 'Opportunity', col: 'ownerId' },
    { table: 'Client', col: 'createdBy' },
    { table: 'Session', col: 'userId' },
    { table: 'Account', col: 'userId' },
    { table: 'Activity', col: 'ownerId' },
    { table: 'Activity', col: 'assignedToId' },
    { table: 'Note', col: 'createdBy' },
    { table: 'Task', col: 'createdBy' },
    { table: 'Task', col: 'assignedToId' },
    { table: 'Project', col: 'createdBy' },
    { table: 'User', col: 'id' }
  ];
  
  const uniqueUsers = new Set();
  
  for (const t of tables) {
    try {
      const res = await client.query(`SELECT DISTINCT "${t.col}" FROM "${t.table}" WHERE "${t.col}" IS NOT NULL`);
      for (const row of res.rows) {
        uniqueUsers.add(row[t.col]);
      }
    } catch (err) {
      // ignore
    }
  }
  
  console.log(Array.from(uniqueUsers));
  await client.end();
}

main().catch(console.error);
