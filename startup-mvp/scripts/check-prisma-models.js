const dotenv = require("dotenv");
dotenv.config();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const targetOrgId = "cmltc6oik002yn1011ghceakr";
  
  // List of all Prisma models
  const prismaModels = [
    'User', 'Organization', 'Client', 'Contact', 'Lead', 'Opportunity', 
    'Quotation', 'QuotationItem', 'QuotationTerms', 'Order', 'OrderItem', 
    'Invoice', 'InvoiceItem', 'Purchase', 'PurchaseItem', 'Supplier', 
    'Project', 'Task', 'Milestone', 'Timesheet', 'Category', 'Tag', 'Note', 
    'Doc', 'Employee', 'Attendance', 'LeaveApplication', 'Payroll', 'PayrollItem',
    'Warehouse', 'Item', 'ItemCategory', 'ItemGroup', 'Unit', 'Delivery',
    'DeliverySchedule', 'DeliveryScheduleItem', 'DeliveryLedger', 'CashBankAccount',
    'ChartOfAccount', 'JournalEntry', 'JournalEntryLine', 'Voucher', 'VoucherLine',
    'BiometricDevice', 'BiometricSyncLog', 'AttendanceLog', 'Shift', 'Holiday',
    'Overtime', 'EmployeeSalary', 'EmployeeLoan', 'CategoryGroup', 'Section',
    'ModuleGroup', 'ModuleGroupItem', 'ModuleOperation', 'PermissionTemplate',
    'UserPermission', 'CoverLetter', 'ActivityReport', 'Checklist', 'ChecklistItem',
    'MyDayTask', 'TaskWatcher', 'TaskDependency', 'MilestoneDependency',
    'WorkSession', 'WorkSessionLog', 'EntityFileLink', 'File'
  ];

  console.log("=== CHECKING PRISMA MODELS VS DATABASE DATA ===");

  for (const modelName of prismaModels) {
    const modelKey = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    try {
      if (!prisma[modelKey]) continue;

      const totalCount = await prisma[modelKey].count();
      if (totalCount === 0) continue;

      let orgCount = -1;
      try {
        orgCount = await prisma[modelKey].count({
          where: { organizationId: targetOrgId }
        });
      } catch (e) {
        orgCount = -2; // organizationId field might not exist on this model in Prisma
      }

      console.log(`Model: ${modelName.padEnd(20)} | Total: ${String(totalCount).padStart(5)} | Target Org: ${String(orgCount).padStart(5)}`);
    } catch (err) {
      console.warn(`Model ${modelName} query error: ${err.message.split('\n')[0]}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
