const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
    
    const userCount = await prisma.user.count();
    console.log('✅ Database connection successful!');
    console.log(`✅ Found ${userCount} users in the database`);
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      take: 5,
    });
    
    console.log('\n📋 Sample users:');
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.role}`);
    });
    
    const logCount = await prisma.userLog.count();
    console.log(`\n✅ Found ${logCount} user logs in the database`);
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    if (error.meta) {
      console.error('Error meta:', JSON.stringify(error.meta, null, 2));
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

