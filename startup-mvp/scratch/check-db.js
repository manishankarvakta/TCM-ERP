const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function check() {
  try {
    const sessions = await prisma.session.findMany({
      include: { user: true }
    });
    console.log("Sessions count:", sessions.length);
    sessions.forEach(s => {
      console.log(`Session: ${s.id}, User: ${s.user.email}, Expires: ${s.expires}`);
    });

    const now = new Date();
    console.log("Current time:", now);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
