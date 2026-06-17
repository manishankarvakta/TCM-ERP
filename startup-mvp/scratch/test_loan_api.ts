import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const loan = await prisma.employeeLoan.findUnique({
    where: { id: "cmptz907i003vcklki3vkfl9v" },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          employeeCode: true,
          designation: true,
          department: true,
        }
      },
      approver: {
        select: {
          id: true,
          name: true,
        }
      },
      voucher: {
        select: {
          id: true,
          voucherNo: true,
        }
      }
    }
  });

  console.log("Result:", JSON.stringify(loan, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
