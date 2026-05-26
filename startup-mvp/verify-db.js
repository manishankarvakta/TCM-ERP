const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function verifyDatabase() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 Running PostgreSQL Database Health & Admin Audit');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // 1. Connection check
    console.log('📡 Connecting to PostgreSQL database...');
    await prisma.$connect();
    console.log('✅ Connection to PostgreSQL established successfully!');

    // 2. Schema check (Verify tables/models)
    console.log('\n📁 Auditing database tables/models...');
    const models = [
      'user', 'employee', 'account', 'session', 'verificationToken',
      'passwordReset', 'userLog', 'file', 'notification', 'unit',
      'organization', 'category', 'item', 'warehouse', 'stock',
      'stockLedger', 'bOM', 'bOMItem', 'productionOrder', 'client',
      'supplier', 'purchase', 'purchaseItem', 'sale', 'saleItem',
      'settings', 'permissionTemplate', 'userPermission', 'moduleOperation',
      'cashBankAccount', 'chartOfAccount', 'journalEntry', 'journalEntryLine'
    ];

    const missingModels = [];
    for (const model of models) {
      try {
        await prisma[model].count();
        console.log(`  - Table for '${model}': [Found]`);
      } catch (err) {
        console.log(`  - Table for '${model}': [Missing/Error] -> ${err.message}`);
        missingModels.push(model);
      }
    }

    if (missingModels.length === 0) {
      console.log('✅ All expected tables exist in the database!');
    } else {
      console.log(`❌ Some tables are missing: ${missingModels.join(', ')}`);
    }

    // 3. User verification
    console.log('\n👤 Auditing Admin User...');
    const adminEmail = 'admin@example.com';
    const adminUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!adminUser) {
      console.log(`❌ Admin user '${adminEmail}' NOT found in the database!`);
      process.exit(1);
    }

    console.log(`✅ Admin user '${adminEmail}' found!`);
    console.log(`  - Name: ${adminUser.name}`);
    console.log(`  - Role: ${adminUser.role}`);
    console.log(`  - Status: '${adminUser.status}'`);
    console.log(`  - Created At: ${adminUser.createdAt}`);
    console.log(`  - Password Hash: ${adminUser.password}`);

    // Check status
    if (adminUser.status === 'active') {
      console.log(`✅ Status is active!`);
    } else {
      console.log(`❌ Status is '${adminUser.status}' (expected 'active')`);
    }

    // 4. Verify password hash logic (bcryptjs)
    console.log('\n🔑 Verifying password hash logic...');
    const passwordToTest = 'admin123';
    const isPasswordValid = await bcrypt.compare(passwordToTest, adminUser.password);

    if (isPasswordValid) {
      console.log(`✅ Password match success! The password '${passwordToTest}' matches the hash.`);
    } else {
      console.log(`❌ Password match failed! The hash in DB does not match '${passwordToTest}'.`);
    }

    // 5. Check if any migration issues or general status
    const userCount = await prisma.user.count();
    console.log(`\n📊 Total Users in DB: ${userCount}`);

  } catch (error) {
    console.error('❌ Database Audit failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabase();
