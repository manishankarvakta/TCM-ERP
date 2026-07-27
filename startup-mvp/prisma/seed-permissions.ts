import { PrismaClient } from "@prisma/client";
import type { EnhancedPermissions } from "@/types/permissions";
import { NAVIGATION_STRUCTURE } from "@/types/permissions";

const prisma = new PrismaClient();

async function seedPermissions() {
  console.log("Seeding permission templates...");

  // Helper to create enhanced permissions for a set of pages
  function createPermissionsForPages(
    pageKeys: string[],
    operations: string[]
  ): Partial<EnhancedPermissions> {
    const perms: Partial<EnhancedPermissions> = {};
    for (const pageKey of pageKeys) {
      perms[pageKey] = {
        navigationVisible: true,
        pageAccess: true,
        operations: operations as any,
      };
    }
    return perms;
  }

  // Get all page keys from navigation structure
  const allPageKeys = NAVIGATION_STRUCTURE.flatMap((nav) =>
    nav.pages.map((page) => page.permissionKey)
  );
  const allStandardOps = ["create", "view", "edit", "move-to-trash", "delete-permanently"];

  const hrExtraKeys = [
    "hr.view",
    "hr.employee.view",
    "hr.employee.manage",
    "hr.attendance.view",
    "hr.attendance.manage",
    "hr.attendance.import",
    "hr.biometric.view",
    "hr.biometric.sync",
    "hr.biometric.manage",
    "hr.payroll.view",
    "hr.payroll.manage",
    "hr.fines",
    "hr.bonuses"
  ];

  // Manager Template - Full access to all pages
  const managerPermissions: Partial<EnhancedPermissions> = {
    ...createPermissionsForPages(allPageKeys, allStandardOps),
    ...createPermissionsForPages(hrExtraKeys, allStandardOps)
  };

  // Sales Executive Template - Quotations and Clients focus
  const salesExecutivePermissions: Partial<EnhancedPermissions> = {
    ...createPermissionsForPages(
      ["dashboard", "profile", "settings"],
      ["view"]
    ),
    // Items - read-only
    ...createPermissionsForPages(
      ["items.items", "items.groups", "items.category", "items.units"],
      ["view"]
    ),
    // Quotations - full access
    ...createPermissionsForPages(
      ["quotations.quotations", "quotations.invoices", "quotations.orders"],
      ["create", "view", "edit", "move-to-trash"]
    ),
    // Purchases - view only
    ...createPermissionsForPages(["purchases.purchases"], ["view"]),
    // Accounts - read-only
    ...createPermissionsForPages(
      [
        "accounts.chart-of-accounts",
        "accounts.ledgers",
        "accounts.vouchers",
        "accounts.trial-balance",
        "accounts.balance-sheet",
        "accounts.profit-loss",
        "accounts.cash-bank",
        "accounts.accounts-receivable",
        "accounts.accounts-payable",
      ],
      ["view"]
    ),
    // Peoples - clients and suppliers focus
    ...createPermissionsForPages(
      ["peoples.clients", "peoples.suppliers"],
      ["create", "view", "edit", "move-to-trash"]
    ),
    ...createPermissionsForPages(["peoples.users"], ["view"]),
    ...createPermissionsForPages(["files"], ["view", "create"]),
    ...createPermissionsForPages(["notifications"], ["view"]),
    ...createPermissionsForPages(["reports.view", "inventory.stock-movements"], ["view"]),
    // Sales - full access
    ...createPermissionsForPages(["sales.sales"], ["create", "view", "edit", "approve", "move-to-trash", "delete-permanently"]),
  };

  // Accounts Template - Accounts module focus
  const accountsPermissions: Partial<EnhancedPermissions> = {
    ...createPermissionsForPages(
      ["dashboard", "profile", "settings"],
      ["view"]
    ),
    // Items - read-only
    ...createPermissionsForPages(
      ["items.items", "items.groups", "items.category", "items.units"],
      ["view"]
    ),
    // Quotations - read-only
    ...createPermissionsForPages(
      ["quotations.quotations", "quotations.invoices", "quotations.orders"],
      ["view"]
    ),
    // Accounts - full access
    ...createPermissionsForPages(
      [
        "accounts.chart-of-accounts",
        "accounts.ledgers",
        "accounts.vouchers",
        "accounts.trial-balance",
        "accounts.balance-sheet",
        "accounts.profit-loss",
        "accounts.cash-bank",
        "accounts.accounts-receivable",
        "accounts.accounts-payable",
      ],
      allStandardOps
    ),
    // Purchases - full access
    ...createPermissionsForPages(["purchases.purchases"], allStandardOps),
    // Sales - view only
    ...createPermissionsForPages(["sales.sales"], ["view"]),
    // Inventory - view only
    ...createPermissionsForPages(["inventory.stock"], ["view"]),
    // Production - view only
    ...createPermissionsForPages(["production.boms", "production.orders"], ["view"]),
    // Peoples - read-only
    ...createPermissionsForPages(
      ["peoples.users", "peoples.clients", "peoples.suppliers"],
      ["view"]
    ),
    ...createPermissionsForPages(["files"], ["view"]),
    ...createPermissionsForPages(["notifications"], ["view"]),
    ...createPermissionsForPages(["reports.view", "inventory.stock-movements"], ["view"]),
  };

  // Basic User Template - Read-only
  const basicUserPermissions: Partial<EnhancedPermissions> =
    createPermissionsForPages(allPageKeys, ["view"]);

  // ============================================
  // ADMIN CATEGORY - System & Operations Management
  // ============================================

  // Super Admin Template - Full system access (developer-level)
  const superAdminPermissions: Partial<EnhancedPermissions> = {
    ...createPermissionsForPages(allPageKeys, ["create", "view", "edit", "move-to-trash", "delete-permanently", "export", "import"]),
    ...createPermissionsForPages(hrExtraKeys, ["create", "view", "edit", "move-to-trash", "delete-permanently", "export", "import"])
  };

  // Admin Template - Full operational access (no system/developer settings)
  const adminPermissions: Partial<EnhancedPermissions> = {
    ...createPermissionsForPages(
      ["dashboard", "profile"],
      ["view", "edit"]
    ),
    // Items - full access
    ...createPermissionsForPages(
      ["items.items", "items.groups", "items.category", "items.units"],
      allStandardOps
    ),
    // Quotations - full access
    ...createPermissionsForPages(
      ["quotations.quotations", "quotations.invoices", "quotations.orders"],
      allStandardOps
    ),
    // Accounts - full access
    ...createPermissionsForPages(
      [
        "accounts.chart-of-accounts",
        "accounts.ledgers",
        "accounts.vouchers",
        "accounts.trial-balance",
        "accounts.balance-sheet",
        "accounts.profit-loss",
        "accounts.cash-bank",
        "accounts.accounts-receivable",
        "accounts.accounts-payable",
      ],
      allStandardOps
    ),
    // Purchases - full access
    ...createPermissionsForPages(["purchases.purchases"], allStandardOps),
    // Sales - full access
    ...createPermissionsForPages(["sales.sales"], ["create", "view", "edit", "approve", "move-to-trash", "delete-permanently"]),
    // Inventory - full access
    ...createPermissionsForPages(["inventory.stock"], ["view", "adjust"]),
    // Production - full access
    ...createPermissionsForPages(["production.boms"], allStandardOps),
    ...createPermissionsForPages(["production.orders"], ["view", "create", "edit", "start", "complete", "cancel"]),
    // Peoples - full access
    ...createPermissionsForPages(
      ["peoples.users", "peoples.clients", "peoples.suppliers"],
      allStandardOps
    ),
    ...createPermissionsForPages(["files"], allStandardOps),
    ...createPermissionsForPages(["notifications"], ["view", "edit"]),
    ...createPermissionsForPages(["reports.view", "inventory.stock-movements"], ["view", "export"]),
    // HR Extra permissions
    ...createPermissionsForPages(hrExtraKeys, allStandardOps),
    // Settings - full access except developer tools
    ...createPermissionsForPages(
      [
        "settings",
        "settings.organization",
        "settings.experience",
        "settings.accounts",
        "settings.emails",
        "settings.calendars",
        "settings.whatsapp",
        "settings.telegram",
        "settings.sms",
        "settings.backup",
        "settings.permissions",
        "settings.tex",
        "settings.paymentMethods",
        "settings.preferences",
        "settings.coverLetter",
        "settings.tos",
        "settings.general",
        "settings.members",
        "settings.membership",
      ],
      ["view", "edit"]
    ),
    // NO access to developer settings
  };

  // Directors Template - View-only across all modules
  const directorsPermissions: Partial<EnhancedPermissions> = {
    ...createPermissionsForPages(
      ["dashboard", "profile"],
      ["view"]
    ),
    // Items - view only
    ...createPermissionsForPages(
      ["items.items", "items.groups", "items.category", "items.units"],
      ["view"]
    ),
    // Quotations - view and export
    ...createPermissionsForPages(
      ["quotations.quotations", "quotations.invoices", "quotations.orders"],
      ["view", "export"]
    ),
    // Purchases - view only
    ...createPermissionsForPages(["purchases.purchases"], ["view"]),
    // Accounts - view and export
    ...createPermissionsForPages(
      [
        "accounts.chart-of-accounts",
        "accounts.ledgers",
        "accounts.vouchers",
        "accounts.trial-balance",
        "accounts.balance-sheet",
        "accounts.profit-loss",
        "accounts.cash-bank",
        "accounts.accounts-receivable",
        "accounts.accounts-payable",
      ],
      ["view", "export"]
    ),
    // Peoples - view only
    ...createPermissionsForPages(
      ["peoples.users", "peoples.clients", "peoples.suppliers"],
      ["view"]
    ),
    // Sales - view only
    ...createPermissionsForPages(["sales.sales"], ["view"]),
    // Inventory - view only
    ...createPermissionsForPages(["inventory.stock"], ["view"]),
    // Production - view only
    ...createPermissionsForPages(["production.boms", "production.orders"], ["view"]),
    ...createPermissionsForPages(["files"], ["view"]),
    ...createPermissionsForPages(["notifications"], ["view"]),
    ...createPermissionsForPages(["reports.view", "inventory.stock-movements"], ["view", "export"]),
  };

  // ============================================
  // USER CATEGORY - Operational Roles
  // ============================================

  // Accountant Template - Financial operations focus
  const accountantPermissions: Partial<EnhancedPermissions> = {
    ...createPermissionsForPages(
      ["dashboard", "profile"],
      ["view"]
    ),
    // Items - view only (for pricing context)
    ...createPermissionsForPages(
      ["items.items", "items.groups", "items.category", "items.units"],
      ["view"]
    ),
    // Quotations - view and export (for financial context)
    ...createPermissionsForPages(
      ["quotations.quotations", "quotations.invoices", "quotations.orders"],
      ["view", "export"]
    ),
    // Accounts - full access
    ...createPermissionsForPages(
      [
        "accounts.chart-of-accounts",
        "accounts.ledgers",
        "accounts.vouchers",
        "accounts.trial-balance",
        "accounts.balance-sheet",
        "accounts.profit-loss",
        "accounts.cash-bank",
        "accounts.accounts-receivable",
        "accounts.accounts-payable",
      ],
      allStandardOps
    ),
    // Purchases - full access
    ...createPermissionsForPages(["purchases.purchases"], allStandardOps),
    // Sales - view only
    ...createPermissionsForPages(["sales.sales"], ["view"]),
    // Inventory - view only
    ...createPermissionsForPages(["inventory.stock"], ["view"]),
    // Production - view only
    ...createPermissionsForPages(["production.boms", "production.orders"], ["view"]),
    // Peoples - view and limited edit
    ...createPermissionsForPages(
      ["peoples.clients", "peoples.suppliers"],
      ["view", "edit"]
    ),
    ...createPermissionsForPages(["peoples.users"], ["view"]),
    ...createPermissionsForPages(["files"], ["view"]),
    ...createPermissionsForPages(["notifications"], ["view"]),
    ...createPermissionsForPages(["reports.view", "inventory.stock-movements"], ["view", "export"]),
    // Settings - accounts related
    ...createPermissionsForPages(
      ["settings.accounts", "settings.tex", "settings.paymentMethods"],
      ["view", "edit"]
    ),
  };

  // Line Manager Template - Quotation approval and status management
  const lineManagerPermissions: Partial<EnhancedPermissions> = {
    ...createPermissionsForPages(
      ["dashboard", "profile"],
      ["view"]
    ),
    // Items - view only
    ...createPermissionsForPages(
      ["items.items", "items.groups", "items.category", "items.units"],
      ["view"]
    ),
    // Quotations - view, edit, approve (no create)
    ...createPermissionsForPages(
      ["quotations.quotations"],
      ["view", "edit", "export"]
    ),
    // Orders - view and edit status
    ...createPermissionsForPages(
      ["quotations.invoices", "quotations.orders"],
      ["view", "edit", "export"]
    ),
    // Purchases - view only
    ...createPermissionsForPages(["purchases.purchases"], ["view"]),
    // Accounts - view only
    ...createPermissionsForPages(
      [
        "accounts.chart-of-accounts",
        "accounts.ledgers",
        "accounts.vouchers",
        "accounts.trial-balance",
        "accounts.balance-sheet",
        "accounts.profit-loss",
        "accounts.cash-bank",
        "accounts.accounts-receivable",
        "accounts.accounts-payable",
      ],
      ["view"]
    ),
    // Peoples - view only
    ...createPermissionsForPages(
      ["peoples.users", "peoples.clients", "peoples.suppliers"],
      ["view"]
    ),
    // Sales - view only
    ...createPermissionsForPages(["sales.sales"], ["view"]),
    // Inventory - view only
    ...createPermissionsForPages(["inventory.stock"], ["view"]),
    // Production - view only
    ...createPermissionsForPages(["production.boms", "production.orders"], ["view"]),
    ...createPermissionsForPages(["files"], ["view", "create"]),
    ...createPermissionsForPages(["notifications"], ["view"]),
    ...createPermissionsForPages(["reports.view", "inventory.stock-movements"], ["view", "export"]),
  };

  // SR (Sales Representative) Template - Quotation creation and client management
  const srPermissions: Partial<EnhancedPermissions> = {
    ...createPermissionsForPages(
      ["dashboard", "profile"],
      ["view"]
    ),
    // Items - view and limited edit
    ...createPermissionsForPages(
      ["items.items"],
      ["view", "edit"]
    ),
    ...createPermissionsForPages(
      ["items.groups", "items.category", "items.units"],
      ["view"]
    ),
    // Quotations - full CRUD
    ...createPermissionsForPages(
      ["quotations.quotations", "quotations.invoices"],
      ["create", "view", "edit", "move-to-trash"]
    ),
    ...createPermissionsForPages(
      ["quotations.orders"],
      ["view"]
    ),
    // Purchases - view only
    ...createPermissionsForPages(["purchases.purchases"], ["view"]),
    // Accounts - view only
    ...createPermissionsForPages(
      [
        "accounts.chart-of-accounts",
        "accounts.ledgers",
        "accounts.vouchers",
        "accounts.trial-balance",
        "accounts.balance-sheet",
        "accounts.profit-loss",
        "accounts.cash-bank",
        "accounts.accounts-receivable",
        "accounts.accounts-payable",
      ],
      ["view"]
    ),
    // Peoples - full CRUD on clients, view suppliers
    ...createPermissionsForPages(
      ["peoples.clients"],
      allStandardOps
    ),
    ...createPermissionsForPages(
      ["peoples.suppliers", "peoples.users"],
      ["view"]
    ),
    // Sales - full access
    ...createPermissionsForPages(["sales.sales"], ["create", "view", "edit", "approve", "move-to-trash", "delete-permanently"]),
    // Inventory - view only
    ...createPermissionsForPages(["inventory.stock"], ["view"]),
    // Production - view only
    ...createPermissionsForPages(["production.boms", "production.orders"], ["view"]),
    ...createPermissionsForPages(["files"], ["view", "create"]),
    ...createPermissionsForPages(["notifications"], ["view"]),
    ...createPermissionsForPages(["reports.view", "inventory.stock-movements"], ["view"]),
  };

  // Architect Template - Technical quotation creation with item/group focus
  const architectPermissions: Partial<EnhancedPermissions> = {
    ...createPermissionsForPages(
      ["dashboard", "profile"],
      ["view"]
    ),
    // Items - full CRUD
    ...createPermissionsForPages(
      ["items.items", "items.groups", "items.category", "items.units"],
      allStandardOps
    ),
    // Quotations - full CRUD
    ...createPermissionsForPages(
      ["quotations.quotations", "quotations.invoices"],
      ["create", "view", "edit", "move-to-trash"]
    ),
    ...createPermissionsForPages(
      ["quotations.orders"],
      ["view"]
    ),
    // Purchases - view only
    ...createPermissionsForPages(["purchases.purchases"], ["view"]),
    // Accounts - view only
    ...createPermissionsForPages(
      [
        "accounts.chart-of-accounts",
        "accounts.ledgers",
        "accounts.vouchers",
        "accounts.trial-balance",
        "accounts.balance-sheet",
        "accounts.profit-loss",
        "accounts.cash-bank",
        "accounts.accounts-receivable",
        "accounts.accounts-payable",
      ],
      ["view"]
    ),
    // Peoples - view and limited edit on clients
    ...createPermissionsForPages(
      ["peoples.clients"],
      ["view", "edit"]
    ),
    ...createPermissionsForPages(
      ["peoples.suppliers", "peoples.users"],
      ["view"]
    ),
    // Sales - view only
    ...createPermissionsForPages(["sales.sales"], ["view"]),
    // Inventory - view only
    ...createPermissionsForPages(["inventory.stock"], ["view"]),
    // Production - view only
    ...createPermissionsForPages(["production.boms", "production.orders"], ["view"]),
    ...createPermissionsForPages(["files"], allStandardOps),
    ...createPermissionsForPages(["notifications"], ["view"]),
    ...createPermissionsForPages(["reports.view", "inventory.stock-movements"], ["view", "export"]),
  };

  // Factory Manager Template - Order management and production tracking
  const factoryManagerPermissions: Partial<EnhancedPermissions> = {
    ...createPermissionsForPages(
      ["dashboard", "profile"],
      ["view"]
    ),
    // Items - view only (production specs)
    ...createPermissionsForPages(
      ["items.items", "items.groups", "items.category", "items.units"],
      ["view"]
    ),
    // Quotations - view only (for context)
    ...createPermissionsForPages(
      ["quotations.quotations", "quotations.invoices"],
      ["view"]
    ),
    // Orders - view and edit (status updates)
    ...createPermissionsForPages(
      ["quotations.orders"],
      ["view", "edit", "export"]
    ),
    // Purchases - view only
    ...createPermissionsForPages(["purchases.purchases"], ["view"]),
    // Accounts - no access
    // Peoples - view suppliers
    ...createPermissionsForPages(
      ["peoples.suppliers"],
      ["view"]
    ),
    ...createPermissionsForPages(
      ["peoples.clients", "peoples.users"],
      ["view"]
    ),
    // Sales - view only
    ...createPermissionsForPages(["sales.sales"], ["view"]),
    // Inventory - view and adjust
    ...createPermissionsForPages(["inventory.stock"], ["view", "adjust"]),
    // Production - full access
    ...createPermissionsForPages(["production.boms"], allStandardOps),
    ...createPermissionsForPages(["production.orders"], ["view", "create", "edit", "start", "complete", "cancel"]),
    ...createPermissionsForPages(["files"], ["view", "create"]),
    ...createPermissionsForPages(["notifications"], ["view"]),
    ...createPermissionsForPages(["reports.view", "inventory.stock-movements"], ["view"]),
  };

  const templates = [
    {
      name: "Manager",
      description: "Full access to all modules and operations",
      permissions: managerPermissions,
    },
    {
      name: "Sales Executive",
      description: "Focus on quotations, clients, and sales operations",
      permissions: salesExecutivePermissions,
    },
    {
      name: "Accounts",
      description: "Focus on accounting and financial operations",
      permissions: accountsPermissions,
    },
    {
      name: "Basic User",
      description: "Read-only access to all modules",
      permissions: basicUserPermissions,
    },
    // ============================================
    // ADMIN CATEGORY TEMPLATES
    // ============================================
    {
      name: "Super Admin",
      description: "Full system access with developer-level permissions (all access)",
      permissions: superAdminPermissions,
    },
    {
      name: "Admin",
      description: "Full operational access to all modules (no system/developer settings)",
      permissions: adminPermissions,
    },
    {
      name: "Directors",
      description: "View-only access across all modules with export capabilities",
      permissions: directorsPermissions,
    },
    // ============================================
    // USER CATEGORY TEMPLATES
    // ============================================
    {
      name: "Accountant",
      description: "Financial operations focus with full access to accounts module",
      permissions: accountantPermissions,
    },
    {
      name: "Line Manager",
      description: "Quotation approval and status management (view, edit, approve)",
      permissions: lineManagerPermissions,
    },
    {
      name: "SR (Sales Representative)",
      description: "Quotation creation and client management focus",
      permissions: srPermissions,
    },
    {
      name: "Architect",
      description: "Technical quotation creation with full item/group management",
      permissions: architectPermissions,
    },
    {
      name: "Factory Manager",
      description: "Order management and production tracking focus",
      permissions: factoryManagerPermissions,
    },
  ];

  for (const template of templates) {
    await prisma.permissionTemplate.upsert({
      where: { name: template.name },
      update: {
        description: template.description,
        permissions: template.permissions as any,
        isActive: true,
      },
      create: {
        name: template.name,
        description: template.description,
        permissions: template.permissions as any,
        isActive: true,
      },
    });

    console.log(`Synced template: ${template.name}`);
  }

  console.log("Permission templates seeded successfully!");
}

seedPermissions()
  .catch((e) => {
    console.error("Error seeding permissions:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

