import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Migration script to assign codes to all existing employees, clients, and suppliers
 * Format: EMP1000001, EMP1000002... CLI1000001, CLI1000002... SUP1000001, SUP1000002...
 */
async function assignCodes() {
  try {
    console.log("Starting code assignment migration...");

    // Assign/Update employee codes (including old format codes)
    console.log("Assigning/updating employee codes...");
    const employees = await prisma.employee.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

    // Find the highest existing 10-digit code
    const existingEmployees = await prisma.employee.findMany({
      where: {
        employeeCode: {
          startsWith: "EMP",
        },
      },
      orderBy: {
        employeeCode: "desc",
      },
      select: {
        employeeCode: true,
      },
    });

    let empCounter = 1000001;
    if (existingEmployees.length > 0) {
      const lastCode = existingEmployees[0].employeeCode;
      if (lastCode) {
        const codeWithoutPrefix = lastCode.replace("EMP", "");
        const lastNumber = parseInt(codeWithoutPrefix, 10);
        if (!isNaN(lastNumber) && lastNumber >= 1000001) {
          empCounter = lastNumber + 1;
        }
      }
    }

    for (const employee of employees) {
      // Skip if already has a 10-digit code
      if (employee.employeeCode && employee.employeeCode.length === 10 && employee.employeeCode.startsWith("EMP")) {
        const codeWithoutPrefix = employee.employeeCode.replace("EMP", "");
        const number = parseInt(codeWithoutPrefix, 10);
        if (!isNaN(number) && number >= 1000001) {
          continue; // Already has correct format
        }
      }

      let code = `EMP${empCounter.toString().padStart(7, "0")}`;
      
      // Check if code exists and increment if needed
      let codeExists = await prisma.employee.findUnique({
        where: { employeeCode: code },
      });

      while (codeExists) {
        empCounter++;
        code = `EMP${empCounter.toString().padStart(7, "0")}`;
        codeExists = await prisma.employee.findUnique({
          where: { employeeCode: code },
        });
      }

      await prisma.employee.update({
        where: { id: employee.id },
        data: { employeeCode: code },
      });

      console.log(`Updated ${employee.employeeCode || "null"} to ${code} for employee ${employee.name || employee.id}`);
      empCounter++;
    }

    // Assign/Update client codes (including old format codes)
    console.log("Assigning/updating client codes...");
    const clients = await prisma.client.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

    // Find the highest existing 10-digit code
    const existingClients = await prisma.client.findMany({
      where: {
        clientCode: {
          startsWith: "CLI",
        },
      },
      orderBy: {
        clientCode: "desc",
      },
      select: {
        clientCode: true,
      },
    });

    let cliCounter = 1000001;
    if (existingClients.length > 0) {
      const lastCode = existingClients[0].clientCode;
      if (lastCode) {
        const codeWithoutPrefix = lastCode.replace("CLI", "");
        const lastNumber = parseInt(codeWithoutPrefix, 10);
        if (!isNaN(lastNumber) && lastNumber >= 1000001) {
          cliCounter = lastNumber + 1;
        }
      }
    }

    for (const client of clients) {
      // Skip if already has a 10-digit code
      if (client.clientCode && client.clientCode.length === 10 && client.clientCode.startsWith("CLI")) {
        const codeWithoutPrefix = client.clientCode.replace("CLI", "");
        const number = parseInt(codeWithoutPrefix, 10);
        if (!isNaN(number) && number >= 1000001) {
          continue; // Already has correct format
        }
      }

      let code = `CLI${cliCounter.toString().padStart(7, "0")}`;
      
      // Check if code exists and increment if needed
      let codeExists = await prisma.client.findUnique({
        where: { clientCode: code },
      });

      while (codeExists) {
        cliCounter++;
        code = `CLI${cliCounter.toString().padStart(7, "0")}`;
        codeExists = await prisma.client.findUnique({
          where: { clientCode: code },
        });
      }

      await prisma.client.update({
        where: { id: client.id },
        data: { clientCode: code },
      });

      console.log(`Updated ${client.clientCode || "null"} to ${code} for client ${client.name || client.email}`);
      cliCounter++;
    }

    // Assign/Update supplier codes (including old format codes)
    console.log("Assigning/updating supplier codes...");
    const suppliers = await prisma.supplier.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

    // Find the highest existing 10-digit code
    const existingSuppliers = await prisma.supplier.findMany({
      where: {
        supplierCode: {
          startsWith: "SUP",
        },
      },
      orderBy: {
        supplierCode: "desc",
      },
      select: {
        supplierCode: true,
      },
    });

    let supCounter = 1000001;
    if (existingSuppliers.length > 0) {
      const lastCode = existingSuppliers[0].supplierCode;
      if (lastCode) {
        const codeWithoutPrefix = lastCode.replace("SUP", "");
        const lastNumber = parseInt(codeWithoutPrefix, 10);
        if (!isNaN(lastNumber) && lastNumber >= 1000001) {
          supCounter = lastNumber + 1;
        }
      }
    }

    for (const supplier of suppliers) {
      // Skip if already has a 10-digit code
      if (supplier.supplierCode && supplier.supplierCode.length === 10 && supplier.supplierCode.startsWith("SUP")) {
        const codeWithoutPrefix = supplier.supplierCode.replace("SUP", "");
        const number = parseInt(codeWithoutPrefix, 10);
        if (!isNaN(number) && number >= 1000001) {
          continue; // Already has correct format
        }
      }

      let code = `SUP${supCounter.toString().padStart(7, "0")}`;
      
      // Check if code exists and increment if needed
      let codeExists = await prisma.supplier.findUnique({
        where: { supplierCode: code },
      });

      while (codeExists) {
        supCounter++;
        code = `SUP${supCounter.toString().padStart(7, "0")}`;
        codeExists = await prisma.supplier.findUnique({
          where: { supplierCode: code },
        });
      }

      await prisma.supplier.update({
        where: { id: supplier.id },
        data: { supplierCode: code },
      });

      console.log(`Updated ${supplier.supplierCode || "null"} to ${code} for supplier ${supplier.name || supplier.email}`);
      supCounter++;
    }

    console.log("Code assignment migration completed successfully!");
  } catch (error) {
    console.error("Error during code assignment migration:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

assignCodes()
  .then(() => {
    console.log("Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });

