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

  // Manager Template - Full access to all pages
  const managerPermissions: Partial<EnhancedPermissions> =
    createPermissionsForPages(allPageKeys, allStandardOps);
    dashboard: ["create", "read", "update", "delete", "export", "import"],
    // Items sub-modules
    "items.items": ["create", "read", "update", "delete", "export", "import"],
    "items.groups": ["create", "read", "update", "delete", "export", "import"],
    "items.category": ["create", "read", "update", "delete", "export", "import"],
    "items.units": ["create", "read", "update", "delete", "export", "import"],
    // Quotations sub-modules
    "quotations.quotations": ["create", "read", "update", "delete", "export", "import"],
    "quotations.invoices": ["create", "read", "update", "delete", "export", "import"],
    "quotations.orders": ["create", "read", "update", "delete", "export", "import"],
    // Accounts sub-modules
    "accounts.chart-of-accounts": ["create", "read", "update", "delete", "export", "import"],
    "accounts.ledgers": ["create", "read", "update", "delete", "export", "import"],
    "accounts.vouchers": ["create", "read", "update", "delete", "export", "import"],
    "accounts.trial-balance": ["create", "read", "update", "delete", "export", "import"],
    "accounts.balance-sheet": ["create", "read", "update", "delete", "export", "import"],
    "accounts.profit-loss": ["create", "read", "update", "delete", "export", "import"],
    "accounts.cash-bank": ["create", "read", "update", "delete", "export", "import"],
    "accounts.accounts-receivable": ["create", "read", "update", "delete", "export", "import"],
    "accounts.accounts-payable": ["create", "read", "update", "delete", "export", "import"],
    // Peoples sub-modules
    "peoples.users": ["create", "read", "update", "delete", "export", "import"],
    "peoples.clients": ["create", "read", "update", "delete", "export", "import"],
    "peoples.suppliers": ["create", "read", "update", "delete", "export", "import"],
    files: ["create", "read", "update", "delete", "export", "import"],
    notifications: ["create", "read", "update", "delete"],
    analytics: ["read", "export"],
    reports: ["read", "export"],
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
    ...createPermissionsForPages(["analytics", "reports"], ["view"]),
  };
    dashboard: ["read"],
    // Items sub-modules - read-only
    "items.items": ["read", "export"],
    "items.groups": ["read"],
    "items.category": ["read"],
    "items.units": ["read"],
    // Quotations sub-modules - full access
    "quotations.quotations": ["create", "read", "update", "export"],
    "quotations.invoices": ["create", "read", "update", "export"],
    "quotations.orders": ["create", "read", "update", "export"],
    // Accounts sub-modules - read-only
    "accounts.chart-of-accounts": ["read"],
    "accounts.ledgers": ["read"],
    "accounts.vouchers": ["read"],
    "accounts.trial-balance": ["read"],
    "accounts.balance-sheet": ["read"],
    "accounts.profit-loss": ["read"],
    "accounts.cash-bank": ["read"],
    "accounts.accounts-receivable": ["read"],
    "accounts.accounts-payable": ["read"],
    // Peoples sub-modules - clients and suppliers focus
    "peoples.clients": ["create", "read", "update", "export"],
    "peoples.suppliers": ["create", "read", "update", "export"],
    "peoples.users": ["read"],
    files: ["read", "create", "update"],
    notifications: ["read"],
    analytics: ["read"],
    reports: ["read", "export"],
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
    // Peoples - read-only
    ...createPermissionsForPages(
      ["peoples.users", "peoples.clients", "peoples.suppliers"],
      ["view"]
    ),
    ...createPermissionsForPages(["files"], ["view"]),
    ...createPermissionsForPages(["notifications"], ["view"]),
    ...createPermissionsForPages(["analytics", "reports"], ["view"]),
  };
    dashboard: ["read"],
    // Items sub-modules - read-only
    "items.items": ["read"],
    "items.groups": ["read"],
    "items.category": ["read"],
    "items.units": ["read"],
    // Quotations sub-modules - read-only
    "quotations.quotations": ["read", "export"],
    "quotations.invoices": ["read", "export"],
    "quotations.orders": ["read", "export"],
    // Accounts sub-modules - full access
    "accounts.chart-of-accounts": ["create", "read", "update", "delete", "export", "import"],
    "accounts.ledgers": ["create", "read", "update", "delete", "export", "import"],
    "accounts.vouchers": ["create", "read", "update", "delete", "export", "import"],
    "accounts.trial-balance": ["create", "read", "update", "delete", "export", "import"],
    "accounts.balance-sheet": ["create", "read", "update", "delete", "export", "import"],
    "accounts.profit-loss": ["create", "read", "update", "delete", "export", "import"],
    "accounts.cash-bank": ["create", "read", "update", "delete", "export", "import"],
    "accounts.accounts-receivable": ["create", "read", "update", "delete", "export", "import"],
    "accounts.accounts-payable": ["create", "read", "update", "delete", "export", "import"],
    // Peoples sub-modules - read-only
    "peoples.users": ["read"],
    "peoples.clients": ["read"],
    "peoples.suppliers": ["read"],
    files: ["read"],
    notifications: ["read"],
    analytics: ["read"],
    reports: ["read", "export"],
  };

  // Basic User Template - Read-only
  const basicUserPermissions: Partial<EnhancedPermissions> =
    createPermissionsForPages(allPageKeys, ["view"]);
    dashboard: ["read"],
    // Items sub-modules - read-only
    "items.items": ["read"],
    "items.groups": ["read"],
    "items.category": ["read"],
    "items.units": ["read"],
    // Quotations sub-modules - read-only
    "quotations.quotations": ["read"],
    "quotations.invoices": ["read"],
    "quotations.orders": ["read"],
    // Accounts sub-modules - read-only
    "accounts.chart-of-accounts": ["read"],
    "accounts.ledgers": ["read"],
    "accounts.vouchers": ["read"],
    "accounts.trial-balance": ["read"],
    "accounts.balance-sheet": ["read"],
    "accounts.profit-loss": ["read"],
    "accounts.cash-bank": ["read"],
    "accounts.accounts-receivable": ["read"],
    "accounts.accounts-payable": ["read"],
    // Peoples sub-modules - read-only
    "peoples.users": ["read"],
    "peoples.clients": ["read"],
    "peoples.suppliers": ["read"],
    files: ["read"],
    notifications: ["read"],
    analytics: ["read"],
    reports: ["read"],
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
  ];

  for (const template of templates) {
    const existing = await prisma.permissionTemplate.findUnique({
      where: { name: template.name },
    });

    if (existing) {
      console.log(`Template "${template.name}" already exists, skipping...`);
      continue;
    }

    await prisma.permissionTemplate.create({
      data: {
        name: template.name,
        description: template.description,
        permissions: template.permissions as any,
        isActive: true,
      },
    });

    console.log(`Created template: ${template.name}`);
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

