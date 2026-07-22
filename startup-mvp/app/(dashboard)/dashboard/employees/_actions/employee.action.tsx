"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { revalidatePath } from "next/cache";
import { type Prisma, AccountType, VoucherType } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import { validateHRMAccountingSetup } from "@/lib/hr/payroll-settings-guard";

/**
 * Get paginated list of employees with search
 */
export async function getEmployees(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all",
  employeeTypeId?: string,
  gender?: string,
  departmentId?: string
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        employees: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const skip = (page - 1) * limit;

    // Build where clause for search and status
    const where: Prisma.EmployeeWhereInput = {};
    
    // Add search condition
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { employeeCode: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        {
          deviceMappings: {
            some: {
              deviceUserId: { contains: search, mode: "insensitive" }
            }
          }
        }
      ];
    }

    // Filter by status
    if (status === "trash") {
      where.status = "trash";
    } else if (status === "active") {
      where.status = "active";
    } else if (status === "inactive") {
      where.status = "inactive";
    } else if (status === "all") {
      // Show all except trash by default
      where.status = { not: "trash" };
    }

    // Filter by type & gender
    if (employeeTypeId && employeeTypeId !== "all") {
      where.employeeTypeId = employeeTypeId;
    }
    if (gender && gender !== "all") {
      where.gender = gender;
    }
    if (departmentId && departmentId !== "all") {
      where.departmentId = departmentId;
    }

    // Get total count
    const total = await prisma.employee.count({ where });

    // Get employees
    const employees = await prisma.employee.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        employeeCode: true,
        email: true,
        phone: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        status: true,
        designation: true,
        department: true,
        departmentId: true,
        departmentRelation: {
          select: {
            id: true,
            name: true,
          }
        },
        salary: true,
        joiningDate: true,
        gender: true,
        bloodGroup: true,
        dateOfBirth: true,
        nationalId: true,
        address: true,
        emergencyContact: true,
        warehouseId: true,
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
        photo: true,
        shiftId: true,
        type: true,
        nominee: true,
        deviceMappings: {
          select: {
            deviceUserId: true,
          },
        },
        attendanceLogs: {
          orderBy: {
            timestamp: "desc"
          },
          take: 2,
          select: {
            timestamp: true
          }
        },
        salaryPayableAccount: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        advanceAccount: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      employees,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getEmployees error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch employees",
      employees: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

/**
 * Get employee by ID
 */
export async function getEmployeeById(employeeId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        employee: null,
      };
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        email: true,
        phone: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        status: true,
        designation: true,
        department: true,
        departmentId: true,
        departmentRelation: {
          select: {
            id: true,
            name: true,
          }
        },
        salary: true,
        joiningDate: true,
        gender: true,
        bloodGroup: true,
        dateOfBirth: true,
        nationalId: true,
        address: true,
        emergencyContact: true,
        warehouseId: true,
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
        photo: true,
        shiftId: true, shift: { select: { id: true, name: true, startTime: true, endTime: true } },
        type: true,
        employeeTypeId: true,
        employeeType: {
          select: {
            id: true,
            name: true,
            salaryStructurePolicyId: true,
            salaryStructurePolicy: {
              select: {
                id: true,
                name: true,
                basicPercent: true,
                houseRentPercent: true,
                medicalPercent: true,
                transportPercent: true,
                foodPercent: true,
                isDefault: true,
                status: true,
                isTrash: true,
              }
            }
          }
        },
        biometricDeviceId: true,
        nominee: true,
        attendanceLogs: {
          orderBy: {
            timestamp: "desc"
          },
          take: 2,
          select: {
            timestamp: true
          }
        },
        salaryPayableAccount: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
        advanceAccount: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!employee) {
      return {
        success: false,
        error: "Employee not found",
        employee: null,
      };
    }

    let resolvedPolicy = employee.employeeType?.salaryStructurePolicy || null;

    if (!resolvedPolicy) {
      // Find default active SalaryStructurePolicy
      resolvedPolicy = await prisma.salaryStructurePolicy.findFirst({
        where: { isDefault: true, status: "active", isTrash: false }
      });
    }

    let salaryStructure = null;
    if (resolvedPolicy) {
      salaryStructure = {
        id: resolvedPolicy.id,
        name: resolvedPolicy.name,
        basicPercent: Number(resolvedPolicy.basicPercent),
        houseRentPercent: Number(resolvedPolicy.houseRentPercent),
        medicalPercent: Number(resolvedPolicy.medicalPercent),
        transportPercent: Number(resolvedPolicy.transportPercent),
        foodPercent: Number(resolvedPolicy.foodPercent),
        isDefault: resolvedPolicy.isDefault,
        isFallback: false,
      };
    } else {
      // Fallback
      salaryStructure = {
        id: "fallback-structure",
        name: "Hardcoded Fallback Structure",
        basicPercent: 55.00,
        houseRentPercent: 26.00,
        medicalPercent: 5.00,
        transportPercent: 4.00,
        foodPercent: 10.00,
        isDefault: false,
        isFallback: true,
      };
    }

    const serializedEmployee = {
      ...employee,
      salary: employee.salary ? Number(employee.salary) : null,
      employeeType: employee.employeeType ? {
        ...employee.employeeType,
        salaryStructurePolicy: employee.employeeType.salaryStructurePolicy ? {
          ...employee.employeeType.salaryStructurePolicy,
          basicPercent: Number(employee.employeeType.salaryStructurePolicy.basicPercent),
          houseRentPercent: Number(employee.employeeType.salaryStructurePolicy.houseRentPercent),
          medicalPercent: Number(employee.employeeType.salaryStructurePolicy.medicalPercent),
          transportPercent: Number(employee.employeeType.salaryStructurePolicy.transportPercent),
          foodPercent: Number(employee.employeeType.salaryStructurePolicy.foodPercent),
        } : null
      } : null
    };

    return {
      success: true,
      employee: serializedEmployee,
      salaryStructure,
    };
  } catch (error) {
    console.error("getEmployeeById error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch employee",
      employee: null,
    };
  }
}

/**
 * Helper function to find Salaries Payable parent account
 */
async function findSalariesPayableParent(tx?: Prisma.TransactionClient): Promise<string | null> {
  const client = tx || prisma;
  const account = await client.chartOfAccount.findFirst({
    where: {
      name: {
        contains: "Salaries Payable",
        mode: "insensitive",
      },
      status: "active",
      type: AccountType.LIABILITY,
    },
    select: {
      id: true,
    },
  });

  return account?.id || null;
}

/**
 * Helper function to find Employee Advances parent account (optional)
 */
async function findEmployeeAdvancesParent(tx?: Prisma.TransactionClient): Promise<string | null> {
  const client = tx || prisma;
  const account = await client.chartOfAccount.findFirst({
    where: {
      name: {
        contains: "Employee Advances",
        mode: "insensitive",
      },
      status: "active",
      type: AccountType.ASSET,
    },
    select: {
      id: true,
    },
  });

  return account?.id || null;
}

/**
 * Helper function to generate unique account code for salary payable
 * Format: SP-{YYYY}-{NNNN} (e.g., SP-2025-0001)
 * @param tx Optional transaction client - if provided, uses transaction for consistency
 */
async function generateSalaryPayableAccountCode(tx?: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SP-${year}-`;
  const client = tx || prisma;

  // Find the highest number for this year
  const lastAccount = await client.chartOfAccount.findFirst({
    where: {
      code: {
        startsWith: prefix,
      },
    },
    orderBy: {
      code: "desc",
    },
    select: {
      code: true,
    },
  });

  let nextNumber = 1;
  if (lastAccount) {
    const lastNumberStr = lastAccount.code.split("-").pop() || "0";
    const lastNumber = parseInt(lastNumberStr, 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
}

/**
 * Helper function to generate unique employee code
 * Format: EMP{NNNNNNN} (e.g., EMP1000001, EMP1000002, EMP1000003)
 * @param tx Optional transaction client - if provided, uses transaction for consistency
 */
async function generateEmployeeCode(tx?: Prisma.TransactionClient): Promise<string> {
  const prefix = "EMP";
  const client = tx || prisma;

  // Find the highest existing code
  const lastEmployee = await client.employee.findFirst({
    where: {
      employeeCode: {
        startsWith: prefix,
      },
    },
    orderBy: {
      employeeCode: "desc",
    },
    select: {
      employeeCode: true,
    },
  });

  let nextNumber = 1000001;
  if (lastEmployee?.employeeCode) {
    // Extract number from code (e.g., "EMP1000001" -> 1000001)
    const codeWithoutPrefix = lastEmployee.employeeCode.replace(prefix, "");
    const lastNumber = parseInt(codeWithoutPrefix, 10);
    if (!isNaN(lastNumber) && lastNumber >= 1000001) {
      nextNumber = lastNumber + 1;
    }
  }

  // Always use 7 digits for 10-digit total (3 prefix + 7 digits)
  return `${prefix}${nextNumber.toString().padStart(7, "0")}`;
}

/**
 * Helper function to generate unique account code for employee advance
 * Format: EA-{YYYY}-{NNNN} (e.g., EA-2025-0001)
 * @param tx Optional transaction client - if provided, uses transaction for consistency
 */
async function generateAdvanceAccountCode(tx?: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `EA-${year}-`;
  const client = tx || prisma;

  // Find the highest number for this year
  const lastAccount = await client.chartOfAccount.findFirst({
    where: {
      code: {
        startsWith: prefix,
      },
    },
    orderBy: {
      code: "desc",
    },
    select: {
      code: true,
    },
  });

  let nextNumber = 1;
  if (lastAccount) {
    const lastNumberStr = lastAccount.code.split("-").pop() || "0";
    const lastNumber = parseInt(lastNumberStr, 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
}

/**
 * Create a new employee
 */
export async function createEmployee(input: {
  name: string;
  email?: string;
  phone?: string;
  status?: "active" | "inactive";
  designation?: string;
  department?: string;
  departmentId?: string;
  salary?: number;
  joiningDate?: Date;
  gender?: string;
  bloodGroup?: string;
  dateOfBirth?: Date;
  nationalId?: string;
  address?: any;
  emergencyContact?: any;
  warehouseId?: string;
  photo?: string;
  shiftId?: string;
  type?: string;
  employeeTypeId?: string;
  biometricDeviceId?: string;
  nominee?: any;
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        employee: null,
      };
    }

    // Validate required fields
    if (!input.name || input.name.trim() === "") {
      return {
        success: false,
        error: "Name is required",
        employee: null,
      };
    }

    if (!input.phone || input.phone.trim() === "") {
      return {
        success: false,
        error: "Phone is required",
        employee: null,
      };
    }

    // Validate status if provided
    if (input.status && !["active", "inactive"].includes(input.status)) {
      return {
        success: false,
        error: "Status must be 'active' or 'inactive'",
        employee: null,
      };
    }

    // Check permission
    const canCreate = await hasPermission(session.user.id, "peoples.employees", "create");
    if (!canCreate) {
      return {
        success: false,
        error: "You don't have permission to create employees",
        employee: null,
      };
    }

    // Validate HR Accounting Setup Guard
    const hrGuard = await validateHRMAccountingSetup("EMPLOYEE_CREATE");
    if (!hrGuard.ok) {
      return {
        success: false,
        error: hrGuard.errors.join(". "),
        employee: null,
      };
    }

    /**
     * Transaction Safety:
     * All operations (COA creation, employee creation) are wrapped in a single transaction.
     * If any operation fails, the entire transaction is automatically rolled back.
     * This ensures data consistency - either all operations succeed or none do.
     * 
     * The transaction client (tx) is used for all database operations to ensure
     * they all execute within the same transaction context.
     */
    const result = await prisma.$transaction(async (tx) => {
      // Generate unique employee code
      let employeeCode = await generateEmployeeCode(tx);
      
      // Ensure code doesn't exist (double-check for race conditions)
      let employeeCodeExists = await tx.employee.findUnique({
        where: { employeeCode },
        select: { id: true },
      });

      // If code exists, try generating a new one (up to 10 attempts)
      let employeeCodeAttempts = 0;
      while (employeeCodeExists && employeeCodeAttempts < 10) {
        // Extract number and increment
        const parts = employeeCode.split("-");
        const numberPart = parts[parts.length - 1];
        const number = parseInt(numberPart, 10);
        if (!isNaN(number)) {
          const newNumber = number + 1;
          employeeCode = `${parts.slice(0, -1).join("-")}-${newNumber.toString().padStart(4, "0")}`;
        } else {
          // Fallback: append timestamp
          employeeCode = `EMP-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
        }
        employeeCodeExists = await tx.employee.findUnique({
          where: { employeeCode },
          select: { id: true },
        });
        employeeCodeAttempts++;
      }

      if (employeeCodeExists) {
        throw new Error("Unable to generate unique employee code. Please try again.");
      }

      // Find Salaries Payable parent account (required)
      const salariesPayableParentId = await findSalariesPayableParent(tx);
      
      if (!salariesPayableParentId) {
        throw new Error(
          "Salaries Payable control account not found. Please ensure it exists in Chart of Accounts before creating employees."
        );
      }

      // Verify parent account is active
      const parentAccount = await tx.chartOfAccount.findUnique({
        where: { id: salariesPayableParentId },
        select: { id: true, status: true, type: true },
      });

      if (!parentAccount || parentAccount.status !== "active") {
        throw new Error("Salaries Payable parent account is not active");
      }

      if (parentAccount.type !== AccountType.LIABILITY) {
        throw new Error("Salaries Payable parent account must be of type LIABILITY");
      }

      // Generate unique salary payable account code (using transaction client for consistency)
      let salaryPayableCode = await generateSalaryPayableAccountCode(tx);
      
      // Ensure code doesn't exist (double-check for race conditions)
      let codeExists = await tx.chartOfAccount.findUnique({
        where: { code: salaryPayableCode },
        select: { id: true },
      });

      // If code exists, try generating a new one (up to 10 attempts)
      let attempts = 0;
      while (codeExists && attempts < 10) {
        // Extract number and increment
        const parts = salaryPayableCode.split("-");
        const numberPart = parts[parts.length - 1];
        const number = parseInt(numberPart, 10);
        if (!isNaN(number)) {
          const newNumber = number + 1;
          salaryPayableCode = `${parts.slice(0, -1).join("-")}-${newNumber.toString().padStart(4, "0")}`;
        } else {
          // Fallback: append timestamp
          salaryPayableCode = `SP-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
        }
        codeExists = await tx.chartOfAccount.findUnique({
          where: { code: salaryPayableCode },
          select: { id: true },
        });
        attempts++;
      }

      if (codeExists) {
        throw new Error("Unable to generate unique salary payable account code. Please try again.");
      }

      /**
       * Create Salary Payable Chart of Account for employee
       * 
       * Requirements met:
       * - Name: "Salary Payable - {Employee Name}"
       * - Type: LIABILITY
       * - Parent: Salaries Payable control account
       * - Status: "active"
       * 
       * Note: isPostable field does not exist in ChartOfAccount schema.
       * The field appears in the UI form but is form-only and not persisted to the database.
       */
      const employeeName = input.name;
      const salaryPayableAccountName = `Salary Payable - ${employeeName}`;

      const salaryPayableCOA = await tx.chartOfAccount.create({
        data: {
          code: salaryPayableCode,
          name: salaryPayableAccountName,
          type: AccountType.LIABILITY,
          parentId: salariesPayableParentId,
          description: `Salary Payable account for employee: ${employeeName}`,
          status: "active",
          createdBy: session.user.id,
        },
      });

      /**
       * Optionally create Advance account if parent exists
       * 
       * Requirements met:
       * - Name: "Advance - {Employee Name}"
       * - Type: ASSET
       * - Parent: Employee Advances control account (if exists)
       * - Status: "active"
       * - Only created if Employee Advances parent account exists
       * 
       * Note: isPostable field does not exist in ChartOfAccount schema.
       */
      let advanceCOA = null;
      const advanceParentId = await findEmployeeAdvancesParent(tx);
      
      if (advanceParentId) {
        // Verify advance parent account is active
        const advanceParentAccount = await tx.chartOfAccount.findUnique({
          where: { id: advanceParentId },
          select: { id: true, status: true, type: true },
        });

        if (advanceParentAccount && advanceParentAccount.status === "active" && advanceParentAccount.type === AccountType.ASSET) {
          // Generate unique advance account code
          let advanceCode = await generateAdvanceAccountCode(tx);
          
          // Ensure code doesn't exist
          let advanceCodeExists = await tx.chartOfAccount.findUnique({
            where: { code: advanceCode },
            select: { id: true },
          });

          // Retry logic for advance code (up to 10 attempts)
          let advanceAttempts = 0;
          while (advanceCodeExists && advanceAttempts < 10) {
            const parts = advanceCode.split("-");
            const numberPart = parts[parts.length - 1];
            const number = parseInt(numberPart, 10);
            if (!isNaN(number)) {
              const newNumber = number + 1;
              advanceCode = `${parts.slice(0, -1).join("-")}-${newNumber.toString().padStart(4, "0")}`;
            } else {
              advanceCode = `EA-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
            }
            advanceCodeExists = await tx.chartOfAccount.findUnique({
              where: { code: advanceCode },
              select: { id: true },
            });
            advanceAttempts++;
          }

          if (!advanceCodeExists) {
            const advanceAccountName = `Advance - ${employeeName}`;
            
            advanceCOA = await tx.chartOfAccount.create({
              data: {
                code: advanceCode,
                name: advanceAccountName,
                type: AccountType.ASSET,
                parentId: advanceParentId,
                description: `Employee advance account for: ${employeeName}`,
                status: "active",
                createdBy: session.user.id,
              },
            });
          }
        }
      }

      /**
       * Create employee with COA references
       * 
       * The COA IDs are saved in the employee record to maintain the relationship.
       * Both COAs are created before the employee to ensure referential integrity.
       * 
       * Transaction ensures:
       * - If employee creation fails, COAs are rolled back
       * - If COA creation fails, no partial data is saved
       * - All operations are atomic
       */
      // Resolve dynamic employee type name for backward compatibility
      let typeName = input.type || null;
      if (input.employeeTypeId) {
        const empType = await tx.employeeType.findUnique({
          where: { id: input.employeeTypeId },
          select: { name: true },
        });
        if (empType) {
          typeName = empType.name;
        }
      }

      // Resolve dynamic department name for backward compatibility
      let departmentName = input.department || null;
      if (input.departmentId) {
        const dept = await tx.department.findUnique({
          where: { id: input.departmentId },
          select: { name: true },
        });
        if (dept) {
          departmentName = dept.name;
        }
      }

      const employee = await tx.employee.create({
        data: {
          name: input.name,
          employeeCode: employeeCode,
          email: input.email || null,
          phone: input.phone || null,
          status: input.status || "active",
          designation: input.designation || null,
          department: departmentName,
          departmentId: input.departmentId || null,
          salary: input.salary || null,
          joiningDate: input.joiningDate || null,
          gender: input.gender || null,
          bloodGroup: input.bloodGroup || null,
          dateOfBirth: input.dateOfBirth || null,
          nationalId: input.nationalId || null,
          address: input.address || null,
          emergencyContact: input.emergencyContact || null,
          warehouseId: input.warehouseId || null,
          photo: input.photo || null,
          shiftId: input.shiftId || null,
          type: typeName,
          employeeTypeId: input.employeeTypeId || null,
          biometricDeviceId: input.biometricDeviceId || null,
          nominee: input.nominee || null,
          salaryPayableAccountId: salaryPayableCOA.id,
          advanceAccountId: advanceCOA?.id || null,
        },
        select: {
          id: true,
          name: true,
          employeeCode: true,
          email: true,
          phone: true,
          userId: true,
          status: true,
          designation: true,
          department: true,
          departmentId: true,
          departmentRelation: {
            select: {
              id: true,
              name: true,
            }
          },
          salary: true,
          joiningDate: true,
          gender: true,
          bloodGroup: true,
          dateOfBirth: true,
          nationalId: true,
          address: true,
          emergencyContact: true,
          warehouseId: true,
          photo: true,
          shiftId: true,
          type: true,
          employeeTypeId: true,
          nominee: true,
          salaryPayableAccount: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          advanceAccount: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      });

      return { employee, salaryPayableCOA, advanceCOA };
    });

    // Log employee creation
    await logItemCreated(
      session.user.id,
      "Employee",
      result.employee.id,
      result.employee.name,
      { 
        name: result.employee.name,
        employeeCode: result.employee.employeeCode,
        email: result.employee.email,
        phone: result.employee.phone,
        salaryPayableAccountId: result.salaryPayableCOA.id,
        salaryPayableAccountCode: result.salaryPayableCOA.code,
        advanceAccountId: result.advanceCOA?.id,
        advanceAccountCode: result.advanceCOA?.code,
      }
    );

    // Revalidate employees page
    revalidateBothPaths("employees");

    return {
      success: true,
      employee: result.employee,
    };
  } catch (error) {
    console.error("createEmployee error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create employee",
      employee: null,
    };
  }
}

/**
 * Update an employee
 */
export async function updateEmployee(input: {
  id: string;
  name?: string;
  employeeCode?: string;
  email?: string;
  phone?: string;
  userId?: string;
  status?: "active" | "inactive";
  designation?: string;
  department?: string;
  departmentId?: string;
  salary?: number;
  joiningDate?: Date;
  gender?: string;
  bloodGroup?: string;
  dateOfBirth?: Date;
  nationalId?: string;
  address?: any;
  emergencyContact?: any;
  warehouseId?: string;
  photo?: string;
  shiftId?: string;
  type?: string;
  employeeTypeId?: string;
  biometricDeviceId?: string;
  nominee?: any;
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        employee: null,
      };
    }

    // Check if employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        userId: true,
        status: true,
        salaryPayableAccountId: true,
        advanceAccountId: true,
      },
    });

    if (!existingEmployee) {
      return {
        success: false,
        error: "Employee not found",
        employee: null,
      };
    }

    // Check permission
    const canEdit = await hasPermission(session.user.id, "peoples.employees", "edit");
    if (!canEdit) {
      return {
        success: false,
        error: "You don't have permission to edit employees",
        employee: null,
      };
    }

    // Validate name if provided
    if (input.name !== undefined && (!input.name || input.name.trim() === "")) {
      return {
        success: false,
        error: "Name cannot be empty",
        employee: null,
      };
    }

    // Validate phone if provided
    if (input.phone !== undefined && (!input.phone || input.phone.trim() === "")) {
      return {
        success: false,
        error: "Phone cannot be empty",
        employee: null,
      };
    }

    // Validate status if provided
    if (input.status && !["active", "inactive"].includes(input.status)) {
      return {
        success: false,
        error: "Status must be 'active' or 'inactive'",
        employee: null,
      };
    }

    // Check if employeeCode is being changed and if new code already exists
    if (input.employeeCode !== undefined && input.employeeCode !== existingEmployee.employeeCode) {
      if (input.employeeCode) {
        const codeExists = await prisma.employee.findUnique({
          where: { employeeCode: input.employeeCode },
        });

        if (codeExists) {
          return {
            success: false,
            error: "Employee with this code already exists",
            employee: null,
          };
        }
      }
    }

    // Check if userId is being changed and if new userId is already linked
    if (input.userId !== undefined && input.userId !== existingEmployee.userId) {
      if (input.userId) {
        const userIdExists = await prisma.employee.findUnique({
          where: { userId: input.userId },
        });

        if (userIdExists) {
          return {
            success: false,
            error: "User is already linked to another employee",
            employee: null,
          };
        }
      }
    }

    // Use transaction to ensure atomicity when creating missing accounts
    const result = await prisma.$transaction(async (tx) => {
      const employeeName = input.name !== undefined ? input.name : existingEmployee.name;
      let salaryPayableAccountId = existingEmployee.salaryPayableAccountId;
      let advanceAccountId = existingEmployee.advanceAccountId;

      // Check and create Salary Payable account if missing
      if (!salaryPayableAccountId) {
        // Find Salaries Payable parent account (required)
        const salariesPayableParentId = await findSalariesPayableParent(tx);
        
        if (!salariesPayableParentId) {
          throw new Error(
            "Salaries Payable control account not found. Please ensure it exists in Chart of Accounts before updating employees."
          );
        }

        // Verify parent account is active
        const parentAccount = await tx.chartOfAccount.findUnique({
          where: { id: salariesPayableParentId },
          select: { id: true, status: true, type: true },
        });

        if (!parentAccount || parentAccount.status !== "active") {
          throw new Error("Salaries Payable parent account is not active");
        }

        if (parentAccount.type !== AccountType.LIABILITY) {
          throw new Error("Salaries Payable parent account must be of type LIABILITY");
        }

        // Generate unique salary payable account code
        let salaryPayableCode = await generateSalaryPayableAccountCode(tx);
        
        // Ensure code doesn't exist
        let codeExists = await tx.chartOfAccount.findUnique({
          where: { code: salaryPayableCode },
          select: { id: true },
        });

        // Retry logic for code generation (up to 10 attempts)
        let attempts = 0;
        while (codeExists && attempts < 10) {
          const parts = salaryPayableCode.split("-");
          const numberPart = parts[parts.length - 1];
          const number = parseInt(numberPart, 10);
          if (!isNaN(number)) {
            const newNumber = number + 1;
            salaryPayableCode = `${parts.slice(0, -1).join("-")}-${newNumber.toString().padStart(4, "0")}`;
          } else {
            salaryPayableCode = `SP-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
          }
          codeExists = await tx.chartOfAccount.findUnique({
            where: { code: salaryPayableCode },
            select: { id: true },
          });
          attempts++;
        }

        if (codeExists) {
          throw new Error("Unable to generate unique salary payable account code. Please try again.");
        }

        // Create Salary Payable Chart of Account
        const salaryPayableAccountName = `Salary Payable - ${employeeName}`;
        const salaryPayableCOA = await tx.chartOfAccount.create({
          data: {
            code: salaryPayableCode,
            name: salaryPayableAccountName,
            type: AccountType.LIABILITY,
            parentId: salariesPayableParentId,
            description: `Salary Payable account for employee: ${employeeName}`,
            status: "active",
            createdBy: session.user.id,
          },
        });

        salaryPayableAccountId = salaryPayableCOA.id;
      }

      // Check and create Advance account if missing (optional)
      if (!advanceAccountId) {
        const advanceParentId = await findEmployeeAdvancesParent(tx);
        
        if (advanceParentId) {
          // Verify advance parent account is active
          const advanceParentAccount = await tx.chartOfAccount.findUnique({
            where: { id: advanceParentId },
            select: { id: true, status: true, type: true },
          });

          if (advanceParentAccount && advanceParentAccount.status === "active" && advanceParentAccount.type === AccountType.ASSET) {
            // Generate unique advance account code
            let advanceCode = await generateAdvanceAccountCode(tx);
            
            // Ensure code doesn't exist
            let advanceCodeExists = await tx.chartOfAccount.findUnique({
              where: { code: advanceCode },
              select: { id: true },
            });

            // Retry logic for advance code (up to 10 attempts)
            let advanceAttempts = 0;
            while (advanceCodeExists && advanceAttempts < 10) {
              const parts = advanceCode.split("-");
              const numberPart = parts[parts.length - 1];
              const number = parseInt(numberPart, 10);
              if (!isNaN(number)) {
                const newNumber = number + 1;
                advanceCode = `${parts.slice(0, -1).join("-")}-${newNumber.toString().padStart(4, "0")}`;
              } else {
                advanceCode = `EA-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
              }
              advanceCodeExists = await tx.chartOfAccount.findUnique({
                where: { code: advanceCode },
                select: { id: true },
              });
              advanceAttempts++;
            }

            if (!advanceCodeExists) {
              const advanceAccountName = `Advance - ${employeeName}`;
              
              const advanceCOA = await tx.chartOfAccount.create({
                data: {
                  code: advanceCode,
                  name: advanceAccountName,
                  type: AccountType.ASSET,
                  parentId: advanceParentId,
                  description: `Employee advance account for: ${employeeName}`,
                  status: "active",
                  createdBy: session.user.id,
                },
              });

              advanceAccountId = advanceCOA.id;
            }
          }
        }
      }

      // Resolve dynamic employee type name for backward compatibility
      let typeName = input.type !== undefined ? (input.type || null) : undefined;
      if (input.employeeTypeId !== undefined) {
        if (input.employeeTypeId) {
          const empType = await tx.employeeType.findUnique({
            where: { id: input.employeeTypeId },
            select: { name: true },
          });
          if (empType) {
            typeName = empType.name;
          }
        } else {
          typeName = null;
        }
      }

      // Resolve dynamic department name for backward compatibility
      let departmentName = undefined;
      if (input.departmentId !== undefined) {
        if (input.departmentId) {
          const dept = await tx.department.findUnique({
            where: { id: input.departmentId },
            select: { name: true },
          });
          if (dept) {
            departmentName = dept.name;
          }
        } else {
          departmentName = null;
        }
      }

      // Build update data
      const updateData: any = {
        name: input.name !== undefined ? input.name : undefined,
        employeeCode: input.employeeCode !== undefined ? (input.employeeCode || null) : undefined,
        email: input.email !== undefined ? (input.email || null) : undefined,
        phone: input.phone !== undefined ? (input.phone || null) : undefined,
        userId: input.userId !== undefined ? (input.userId || null) : undefined,
        status: input.status !== undefined ? input.status : undefined,
        designation: input.designation !== undefined ? (input.designation || null) : undefined,
        department: departmentName !== undefined ? departmentName : (input.department !== undefined ? (input.department || null) : undefined),
        departmentId: input.departmentId !== undefined ? (input.departmentId || null) : undefined,
        salary: input.salary !== undefined ? (input.salary || null) : undefined,
        joiningDate: input.joiningDate !== undefined ? (input.joiningDate || null) : undefined,
        gender: input.gender !== undefined ? (input.gender || null) : undefined,
        bloodGroup: input.bloodGroup !== undefined ? (input.bloodGroup || null) : undefined,
        dateOfBirth: input.dateOfBirth !== undefined ? (input.dateOfBirth || null) : undefined,
        nationalId: input.nationalId !== undefined ? (input.nationalId || null) : undefined,
        address: input.address !== undefined ? (input.address || null) : undefined,
        emergencyContact: input.emergencyContact !== undefined ? (input.emergencyContact || null) : undefined,
        warehouseId: input.warehouseId !== undefined ? (input.warehouseId || null) : undefined,
        photo: input.photo !== undefined ? (input.photo || null) : undefined,
        shiftId: input.shiftId !== undefined ? (input.shiftId || null) : undefined,
        nominee: input.nominee !== undefined ? (input.nominee || null) : undefined,
        type: typeName,
        employeeTypeId: input.employeeTypeId !== undefined ? (input.employeeTypeId || null) : undefined,
        biometricDeviceId: input.biometricDeviceId !== undefined ? (input.biometricDeviceId || null) : undefined,
      };

      // Add account IDs if they were created
      if (salaryPayableAccountId && salaryPayableAccountId !== existingEmployee.salaryPayableAccountId) {
        updateData.salaryPayableAccountId = salaryPayableAccountId;
      }

      if (advanceAccountId && advanceAccountId !== existingEmployee.advanceAccountId) {
        updateData.advanceAccountId = advanceAccountId;
      }

      // Update employee
      const employee = await tx.employee.update({
        where: { id: input.id },
        data: updateData,
        select: {
          id: true,
          name: true,
          employeeCode: true,
          email: true,
          phone: true,
          userId: true,
          status: true,
          designation: true,
          department: true,
          departmentId: true,
          departmentRelation: {
            select: {
              id: true,
              name: true,
            }
          },
          salary: true,
          joiningDate: true,
          gender: true,
          bloodGroup: true,
          dateOfBirth: true,
          nationalId: true,
          address: true,
          emergencyContact: true,
          warehouseId: true,
          photo: true,
          shiftId: true,
          type: true,
          employeeTypeId: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          salaryPayableAccount: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          advanceAccount: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      });

      // Handle rename: Update COA names if employee name changed and COAs exist
      if (input.name !== undefined && input.name !== existingEmployee.name) {
        const updatedEmployeeName = input.name;
        
        // Update salary payable COA name if it exists
        if (employee.salaryPayableAccount?.id) {
          await tx.chartOfAccount.update({
            where: { id: employee.salaryPayableAccount.id },
            data: {
              name: `Salary Payable - ${updatedEmployeeName}`,
              description: `Salary Payable account for employee: ${updatedEmployeeName}`,
            },
          });
        }
        
        // Update advance COA name if it exists
        if (employee.advanceAccount?.id) {
          await tx.chartOfAccount.update({
            where: { id: employee.advanceAccount.id },
            data: {
              name: `Advance - ${updatedEmployeeName}`,
              description: `Employee advance account for: ${updatedEmployeeName}`,
            },
          });
        }
      }

      return employee;
    });

    const employee = result;

    // Log employee update - track what actually changed
    const changes: string[] = [];
    if (input.name !== undefined && input.name !== existingEmployee.name) changes.push("name");
    if (input.employeeCode !== undefined && input.employeeCode !== existingEmployee.employeeCode) changes.push("employeeCode");
    if (input.email !== undefined && input.email !== employee.email) changes.push("email");
    if (input.phone !== undefined && input.phone !== employee.phone) changes.push("phone");
    if (input.userId !== undefined && input.userId !== existingEmployee.userId) changes.push("userId");
    if (input.status && input.status !== existingEmployee.status) changes.push("status");

    await logItemUpdated(
      session.user.id,
      "Employee",
      employee.id,
      changes,
      employee.name,
      { 
        name: employee.name,
        employeeCode: employee.employeeCode,
        changes 
      }
    );

    // Revalidate employees page
    revalidateBothPaths("employees");
    revalidatePath(`/dashboard/employees/${employee.id}`);
    revalidatePath(`/dashboard/employees/${employee.id}`);

    return {
      success: true,
      employee,
    };
  } catch (error) {
    console.error("updateEmployee error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update employee",
      employee: null,
    };
  }
}

/**
 * Delete an employee (moves to trash)
 */
export async function deleteEmployee(employeeId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Check permission
    const canMoveToTrash = await hasPermission(session.user.id, "peoples.employees", "move-to-trash");
    if (!canMoveToTrash) {
      return {
        success: false,
        error: "You don't have permission to move employees to trash",
      };
    }

    // Get employee info before moving to trash for logging
    const employeeToDelete = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { 
        name: true,
        employeeCode: true,
        userId: true,
        salaryPayableAccountId: true,
        advanceAccountId: true,
      },
    });

    if (!employeeToDelete) {
      return {
        success: false,
        error: "Employee not found",
      };
    }

    // Check if employee has linked accounting entries before deletion
    // Check VoucherLine entries if employee has userId
    if (employeeToDelete.userId) {
      const voucherLineCount = await prisma.voucherLine.count({
        where: {
          userId: employeeToDelete.userId,
        },
      });

      if (voucherLineCount > 0) {
        return {
          success: false,
          error: "Cannot delete employee with linked accounting entries. Employee has voucher entries.",
        };
      }

      // Check JournalEntryLine entries
      const journalEntryLineCount = await prisma.journalEntryLine.count({
        where: {
          userId: employeeToDelete.userId,
        },
      });

      if (journalEntryLineCount > 0) {
        return {
          success: false,
          error: "Cannot delete employee with linked accounting entries. Employee has journal entry lines.",
        };
      }
    }

    // Check if salaryPayableAccountId or advanceAccountId have any voucher/journal entries
    if (employeeToDelete.salaryPayableAccountId) {
      const voucherLineCount = await prisma.voucherLine.count({
        where: {
          chartOfAccountId: employeeToDelete.salaryPayableAccountId,
        },
      });

      const journalEntryLineCount = await prisma.journalEntryLine.count({
        where: {
          chartOfAccountId: employeeToDelete.salaryPayableAccountId,
        },
      });

      if (voucherLineCount > 0 || journalEntryLineCount > 0) {
        return {
          success: false,
          error: "Cannot delete employee with linked accounting entries. Salary payable account has transaction entries.",
        };
      }
    }

    if (employeeToDelete.advanceAccountId) {
      const voucherLineCount = await prisma.voucherLine.count({
        where: {
          chartOfAccountId: employeeToDelete.advanceAccountId,
        },
      });

      const journalEntryLineCount = await prisma.journalEntryLine.count({
        where: {
          chartOfAccountId: employeeToDelete.advanceAccountId,
        },
      });

      if (voucherLineCount > 0 || journalEntryLineCount > 0) {
        return {
          success: false,
          error: "Cannot delete employee with linked accounting entries. Advance account has transaction entries.",
        };
      }
    }

    // Use transaction to ensure both employee and COAs are soft-deleted atomically
    await prisma.$transaction(async (tx) => {
      // Move employee to trash (soft delete)
      await tx.employee.update({
        where: { id: employeeId },
        data: { status: "trash" },
      });

      // Also soft-delete the associated COAs if they exist
      if (employeeToDelete.salaryPayableAccountId) {
        await tx.chartOfAccount.update({
          where: { id: employeeToDelete.salaryPayableAccountId },
          data: { status: "trash" },
        });
      }

      if (employeeToDelete.advanceAccountId) {
        await tx.chartOfAccount.update({
          where: { id: employeeToDelete.advanceAccountId },
          data: { status: "trash" },
        });
      }
    });

    // Log the deletion
    await logItemDeleted(
      session.user.id,
      "Employee",
      employeeId,
      employeeToDelete.name,
      { 
        name: employeeToDelete.name,
        employeeCode: employeeToDelete.employeeCode,
      }
    );

    // Revalidate employees page
    revalidateBothPaths("employees");

    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteEmployee error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete employee",
    };
  }
}

/**
 * Bulk update employee status
 */
export async function bulkUpdateEmployeeStatus(
  employeeIds: string[],
  status: "active" | "inactive" | "trash"
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Check permission based on action
    if (status === "trash") {
      const canMoveToTrash = await hasPermission(session.user.id, "peoples.employees", "move-to-trash");
      if (!canMoveToTrash) {
        return {
          success: false,
          error: "You don't have permission to move employees to trash",
        };
      }
    } else {
      // For active/inactive status changes, check edit permission
      const canEdit = await hasPermission(session.user.id, "peoples.employees", "edit");
      if (!canEdit) {
        return {
          success: false,
          error: "You don't have permission to update employee status",
        };
      }
    }

    if (employeeIds.length === 0) {
      return {
        success: false,
        error: "No employees selected",
      };
    }

    // Get employee names for logging
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
      },
      select: { id: true, name: true, employeeCode: true },
    });

    // Update employees
    await prisma.employee.updateMany({
      where: {
        id: { in: employeeIds },
      },
      data: {
        status,
      },
    });

    // Log bulk update for each employee
    for (const employee of employees) {
      await logItemUpdated(
        session.user.id,
        "Employee",
        employee.id,
        ["status"],
        employee.name,
        { name: employee.name, employeeCode: employee.employeeCode, status, changes: ["status"] }
      );
    }

    // Revalidate employees page
    revalidateBothPaths("employees");

    return {
      success: true,
    };
  } catch (error) {
    console.error("bulkUpdateEmployeeStatus error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update employees",
    };
  }
}

/**
 * Delete employees permanently
 */
export async function deleteEmployeesPermanently(employeeIds: string[]) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Check permission
    const canDeletePermanently = await hasPermission(session.user.id, "peoples.employees", "delete-permanently");
    if (!canDeletePermanently) {
      return {
        success: false,
        error: "You don't have permission to permanently delete employees",
      };
    }

    if (employeeIds.length === 0) {
      return {
        success: false,
        error: "No employees selected",
      };
    }

    // Get employee names for logging
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        status: "trash", // Only allow deleting employees that are in trash
      },
      select: { id: true, name: true, employeeCode: true },
    });

    if (employees.length === 0) {
      return {
        success: false,
        error: "No employees found in trash",
      };
    }

    // Log permanent deletion for each employee
    for (const employee of employees) {
      await logItemDeleted(
        session.user.id,
        "Employee",
        employee.id,
        employee.name,
        { name: employee.name, employeeCode: employee.employeeCode }
      );
    }

    // Delete employees permanently
    await prisma.employee.deleteMany({
      where: {
        id: { in: employeeIds },
        status: "trash", // Only allow deleting employees that are in trash
      },
    });

    // Revalidate employees page
    revalidateBothPaths("employees");
    
    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteEmployeesPermanently error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete employees",
    };
  }
}

/**
 * Synchronize employee biometric IDs with device mappings
 */
export async function syncEmployeeBiometricIds() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const hasManagePerm = await hasPermission(session.user.id, "peoples.employees", "edit");
    if (!hasManagePerm) {
      return { success: false, error: "Forbidden: insufficient permissions" };
    }

    // 1. Fetch all active and inactive employees
    const activeEmployees = await prisma.employee.findMany({
      where: { status: { in: ["active", "inactive"] } },
      select: { id: true, name: true, employeeCode: true, biometricDeviceId: true }
    });

    // 2. Fetch all active biometric devices
    const activeDevices = await prisma.biometricDevice.findMany({
      where: { isActive: true },
      select: { id: true, name: true }
    });

    if (activeDevices.length === 0) {
      return { success: false, error: "No active biometric devices found." };
    }

    let createdMappingsCount = 0;
    let updatedMappingsCount = 0;
    let updatedEmployeePinsCount = 0;

    for (const employee of activeEmployees) {
      // Step A: If employee has biometricDeviceId set, make sure mapping exists on all active devices
      if (employee.biometricDeviceId && /^\d+$/.test(employee.biometricDeviceId)) {
        for (const device of activeDevices) {
          const existingMap = await prisma.employeeDeviceMap.findUnique({
            where: {
              employeeId_deviceId: {
                employeeId: employee.id,
                deviceId: device.id
              }
            }
          });

          if (!existingMap) {
            // Check if deviceUserId is already in use on this device
            const deviceUserIdInUse = await prisma.employeeDeviceMap.findUnique({
              where: {
                deviceId_deviceUserId: {
                  deviceId: device.id,
                  deviceUserId: employee.biometricDeviceId
                }
              }
            });

            if (!deviceUserIdInUse) {
              await prisma.employeeDeviceMap.create({
                data: {
                  employeeId: employee.id,
                  deviceId: device.id,
                  deviceUserId: employee.biometricDeviceId,
                  isActive: true,
                  syncStatus: "READY"
                }
              });
              createdMappingsCount++;
            }
          } else if (existingMap.deviceUserId !== employee.biometricDeviceId) {
            // Check if the new deviceUserId is already in use on this device
            const deviceUserIdInUse = await prisma.employeeDeviceMap.findUnique({
              where: {
                deviceId_deviceUserId: {
                  deviceId: device.id,
                  deviceUserId: employee.biometricDeviceId
                }
              }
            });

            if (!deviceUserIdInUse) {
              await prisma.employeeDeviceMap.update({
                where: { id: existingMap.id },
                data: {
                  deviceUserId: employee.biometricDeviceId,
                  isActive: true,
                  syncStatus: "READY"
                }
              });
              updatedMappingsCount++;
            }
          }
        }
      }
      
      // Step B: If employee does NOT have biometricDeviceId set, check if they have mappings in EmployeeDeviceMap
      if (!employee.biometricDeviceId) {
        const mappings = await prisma.employeeDeviceMap.findMany({
          where: { employeeId: employee.id, isActive: true },
          select: { deviceUserId: true }
        });

        // Find the first mapping with a valid numeric deviceUserId
        const validMapping = mappings.find(m => m.deviceUserId && /^\d+$/.test(m.deviceUserId));
        if (validMapping) {
          await prisma.employee.update({
            where: { id: employee.id },
            data: { biometricDeviceId: validMapping.deviceUserId }
          });
          updatedEmployeePinsCount++;
        }
      }
    }

    revalidatePath("/dashboard/employees");
    revalidatePath("/dashboard/hr/biometric/mapping");

    return { 
      success: true, 
      message: `Sync completed. Created ${createdMappingsCount} device mappings, updated ${updatedMappingsCount} device user IDs, updated ${updatedEmployeePinsCount} employee biometric PINs.` 
    };
  } catch (error: any) {
    console.error("syncEmployeeBiometricIds error:", error);
    return { success: false, error: error.message || "Failed to sync biometric IDs" };
  }
}

/**
 * Fetch summary statistics for the employee dashboard
 */
export async function getEmployeeStats() {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        stats: { all: 0, active: 0, onDuty: 0 }
      };
    }

    const all = await prisma.employee.count({
      where: { status: { not: "trash" } }
    });

    const active = await prisma.employee.count({
      where: { status: "active" }
    });

    // Fetch active employees with their 2 most recent attendance logs to compute on-duty status
    const activeEmployeesWithLogs = await prisma.employee.findMany({
      where: { status: "active" },
      select: {
        attendanceLogs: {
          orderBy: { timestamp: "desc" },
          take: 2,
          select: { timestamp: true }
        }
      }
    });

    let onDuty = 0;
    const now = new Date();
    for (const emp of activeEmployeesWithLogs) {
      const logs = emp.attendanceLogs;
      if (logs && logs.length > 0) {
        const latestPunch = new Date(logs[0].timestamp);
        const hoursSinceLatest = (now.getTime() - latestPunch.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLatest <= 14) {
          if (logs.length === 1) {
            onDuty++;
          } else {
            const prevPunch = new Date(logs[1].timestamp);
            const latestDateString = latestPunch.getFullYear() + "-" + latestPunch.getMonth() + "-" + latestPunch.getDate();
            const prevDateString = prevPunch.getFullYear() + "-" + prevPunch.getMonth() + "-" + prevPunch.getDate();
            if (latestDateString !== prevDateString) {
              onDuty++;
            }
          }
        }
      }
    }

    return {
      success: true,
      stats: { all, active, onDuty }
    };
  } catch (error) {
    console.error("getEmployeeStats error:", error);
    return {
      success: false,
      stats: { all: 0, active: 0, onDuty: 0 }
    };
  }
}

/**
 * Get Employee Ledger with chronological transactions and running balance
 */
export async function getEmployeeLedger(
  employeeId: string,
  startDate?: string | Date,
  endDate?: string | Date
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        employee: null,
        ledger: [],
        summary: { totalEarned: 0, totalPaid: 0, closingBalance: 0, totalTransactions: 0 },
      };
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        email: true,
        phone: true,
        department: true,
        designation: true,
        salary: true,
        status: true,
        joiningDate: true,
        salaryPayableAccountId: true,
        advanceAccountId: true,
        userId: true,
        salaryPayableAccount: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
        advanceAccount: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
        createdAt: true,
      },
    });

    if (!employee) {
      return {
        success: false,
        error: "Employee not found",
        employee: null,
        ledger: [],
        summary: { totalEarned: 0, totalPaid: 0, closingBalance: 0, totalTransactions: 0 },
      };
    }

    const salaryCoaId = employee.salaryPayableAccountId;
    const advanceCoaId = employee.advanceAccountId;
    const userId = employee.userId;

    // Query JournalEntryLine records matching salary payable COA, advance COA, or userId
    const journalLines = await prisma.journalEntryLine.findMany({
      where: {
        OR: [
          ...(salaryCoaId ? [{ chartOfAccountId: salaryCoaId }] : []),
          ...(advanceCoaId ? [{ chartOfAccountId: advanceCoaId }] : []),
          ...(userId ? [{ userId: userId }] : []),
        ],
      },
      include: {
        JournalEntry: {
          include: {
            Voucher: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Query Payroll items for this employee
    const payrollItems = await prisma.payrollItem.findMany({
      where: {
        employeeId: employeeId,
      },
      include: {
        payroll: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Query Loans, Fines, and Bonuses for this employee
    const [loans, fines, bonuses] = await Promise.all([
      prisma.employeeLoan.findMany({
        where: { employeeId: employeeId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.employeeFine.findMany({
        where: { employeeId: employeeId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.employeeBonus.findMany({
        where: { employeeId: employeeId },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const journalVoucherIds = new Set(
      journalLines.map((jl) => jl.JournalEntry?.voucherId).filter(Boolean)
    );

    const rawTransactions: Array<{
      id: string;
      date: Date;
      type: string;
      typeLabel: string;
      reference: string;
      description: string;
      status: string;
      debit: number;
      credit: number;
    }> = [];

    // Process Journal Entry Lines
    for (const line of journalLines) {
      const je = line.JournalEntry;
      const voucher = je?.Voucher;

      let type = "JOURNAL";
      let typeLabel = "Journal Entry";

      if (voucher) {
        if (voucher.type === VoucherType.PAYMENT) {
          type = "PAYMENT";
          typeLabel = "Salary Payment";
        } else if (voucher.type === VoucherType.RECEIPT) {
          type = "RECEIPT";
          typeLabel = "Advance Receipt";
        }
      }

      const reference = voucher?.voucherNumber || je?.entryNumber || "JE";
      const description =
        line.description ||
        voucher?.description ||
        je?.description ||
        `${typeLabel} #${reference}`;

      const txnStatus = (je?.status || voucher?.status || "POSTED").toUpperCase();

      rawTransactions.push({
        id: line.id,
        date: je?.date || line.createdAt,
        type,
        typeLabel,
        reference,
        description,
        status: txnStatus,
        debit: Number(line.debitAmount || 0),
        credit: Number(line.creditAmount || 0),
      });
    }

    // Add Payroll Items not represented in JournalEntryLine
    for (const item of payrollItems) {
      const pr = item.payroll;
      if (!pr.paymentVchId || !journalVoucherIds.has(pr.paymentVchId)) {
        rawTransactions.push({
          id: `payroll-${item.id}`,
          date: pr.dateGenerated || pr.createdAt,
          type: "PAYROLL",
          typeLabel: "Payroll",
          reference: `PAY-${pr.month}-${pr.year}`,
          description: `Payroll for ${pr.month}/${pr.year} - Net Pay: ৳${Number(item.netPay || 0)}`,
          status: pr.status || "POSTED",
          debit: 0,
          credit: Number(item.netPay || 0),
        });
      }
    }

    // Add Loans
    for (const loan of loans) {
      if (!loan.voucherId || !journalVoucherIds.has(loan.voucherId)) {
        rawTransactions.push({
          id: `loan-${loan.id}`,
          date: loan.issueDate || loan.createdAt,
          type: "LOAN",
          typeLabel: "Loan Advance",
          reference: `LON-${loan.id.substring(0, 6)}`,
          description: loan.purpose || `Loan Advance Disbursement`,
          status: loan.status || "APPROVED",
          debit: Number(loan.amount || 0),
          credit: 0,
        });
      }
    }

    // Add Fines
    for (const fine of fines) {
      rawTransactions.push({
        id: `fine-${fine.id}`,
        date: fine.createdAt,
        type: "FINE",
        typeLabel: "Fine",
        reference: `FIN-${fine.id.substring(0, 6)}`,
        description: fine.reason || `Employee Fine Deduction`,
        status: fine.status || "APPROVED",
        debit: Number(fine.amount || 0),
        credit: 0,
      });
    }

    // Add Bonuses
    for (const bonus of bonuses) {
      rawTransactions.push({
        id: `bonus-${bonus.id}`,
        date: bonus.createdAt,
        type: "BONUS",
        typeLabel: "Bonus",
        reference: `BON-${bonus.id.substring(0, 6)}`,
        description: bonus.reason || `Employee Bonus Award`,
        status: bonus.status || "APPROVED",
        debit: 0,
        credit: Number(bonus.amount || 0),
      });
    }

    // Sort all raw transactions chronologically by date ascending
    rawTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Date range filtering
    let filteredTransactions = rawTransactions;
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start) {
      start.setHours(0, 0, 0, 0);
      filteredTransactions = filteredTransactions.filter(
        (t) => new Date(t.date) >= start
      );
    }
    if (end) {
      end.setHours(23, 59, 59, 999);
      filteredTransactions = filteredTransactions.filter(
        (t) => new Date(t.date) <= end
      );
    }

    // Compute running balance (Employee Salary / Advance Payable):
    // Credit (Salary Accrual / Bonus) increases payable due to employee
    // Debit (Payroll Payment / Loan / Fine) decreases payable due to employee
    let runningBalance = 0;
    let totalEarned = 0;
    let totalPaid = 0;

    const ledger = filteredTransactions.map((tx) => {
      runningBalance += tx.credit - tx.debit;
      totalEarned += tx.credit;
      totalPaid += tx.debit;

      return {
        ...tx,
        runningBalance,
      };
    });

    return {
      success: true,
      employee: {
        ...employee,
        salary: Number(employee.salary || 0),
      },
      summary: {
        totalEarned,
        totalPaid,
        closingBalance: runningBalance,
        totalTransactions: ledger.length,
      },
      ledger,
    };
  } catch (error) {
    console.error("getEmployeeLedger error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch employee ledger",
      employee: null,
      ledger: [],
      summary: { totalEarned: 0, totalPaid: 0, closingBalance: 0, totalTransactions: 0 },
    };
  }
}



