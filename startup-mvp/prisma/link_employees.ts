import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Linking employees to users...");

  // Fetch all users and employees
  const users = await prisma.user.findMany();
  const employees = await prisma.employee.findMany();

  for (const emp of employees) {
    // Find a user with a matching name (case-insensitive)
    const matchingUser = users.find(u => 
      u.name && u.name.toLowerCase().includes(emp.name.toLowerCase())
    );

    if (matchingUser) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { userId: matchingUser.id }
      });
      console.log(`Linked employee "${emp.name}" (ID: ${emp.id}) to user "${matchingUser.name}" (ID: ${matchingUser.id})`);
    } else {
      console.log(`No matching user found for employee "${emp.name}"`);
    }
  }

  console.log("Linking completed!");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
