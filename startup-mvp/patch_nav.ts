import fs from 'fs';

let content = fs.readFileSync('types/permissions.ts', 'utf8');

content = content.replace(/\| "purchases"\s*/g, '');
content = content.replace(/\| "rtv"\s*/g, '');
content = content.replace(/\| "hr";/, '| "hr"\n  | "procurements";');

const oldPurchasesRtv = `  purchases: {
    id: "purchases",
    label: "Purchases",
    description: "Manage purchase orders and receipts",
    subModules: [
      { id: "purchases", label: "Purchases", path: "/dashboard/purchases", module: "purchases", permissionKey: "purchases.purchases" },
      { id: "grn", label: "Goods Receipt", path: "/dashboard/purchases/grn", module: "purchases", permissionKey: "purchases.grn" },
    ],
  },
  rtv: {
    id: "rtv",
    label: "Returns (RTV)",
    description: "Manage returns to suppliers",
    subModules: [
      { id: "rtv", label: "Returns", path: "/dashboard/rtv", module: "rtv", permissionKey: "rtv.rtv" },
    ],
  },`;

const newProcurements = `  procurements: {
    id: "procurements",
    label: "Procurements",
    description: "Manage purchases, transfers, and returns",
    subModules: [
      { id: "purchases", label: "Purchases", path: "/dashboard/procurements/purchases", module: "procurements", permissionKey: "procurements.purchases" },
      { id: "grn", label: "Goods Receipt", path: "/dashboard/procurements/grn", module: "procurements", permissionKey: "procurements.grn" },
      { id: "tpn", label: "Transfer Notes", path: "/dashboard/procurements/tpn", module: "procurements", permissionKey: "procurements.tpn" },
      { id: "rtv", label: "Returns (RTV)", path: "/dashboard/procurements/rtv", module: "procurements", permissionKey: "procurements.rtv" },
    ],
  },`;

content = content.replace(oldPurchasesRtv, newProcurements);

content = content.replace(
`      { id: "tpn", label: "Transfer Notes", path: "/dashboard/inventory/tpn", module: "inventory", permissionKey: "inventory.tpn" },\n    ],`,
`    ],`
);

const oldNav = `  {
    id: "purchases",
    label: "Purchases",
    pages: [
      {
        permissionKey: "purchases.purchases",
        path: "/dashboard/purchases",
        label: "Purchases",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "purchases.grn",
        path: "/dashboard/purchases/grn",
        label: "Goods Receipt Note",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
    ],
  },
  {
    id: "rtv",
    label: "Returns (RTV)",
    pages: [
      {
        permissionKey: "rtv.rtv",
        path: "/dashboard/rtv",
        label: "Returns",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
    ],
  },`;

const newNav = `  {
    id: "procurements",
    label: "Procurements",
    pages: [
      {
        permissionKey: "procurements.purchases",
        path: "/dashboard/procurements/purchases",
        label: "Purchases",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "procurements.grn",
        path: "/dashboard/procurements/grn",
        label: "Goods Receipt Note",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "procurements.tpn",
        path: "/dashboard/procurements/tpn",
        label: "Transfer Notes",
        operations: ["create", "view", "edit", "approve", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "procurements.rtv",
        path: "/dashboard/procurements/rtv",
        label: "Returns (RTV)",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
    ],
  },`;

content = content.replace(oldNav, newNav);

content = content.replace(
`      {
        permissionKey: "inventory.tpn",
        path: "/dashboard/inventory/tpn",
        label: "Transfer Notes",
        operations: ["create", "view", "edit", "approve", "move-to-trash", "delete-permanently"],
      },
    ],
  },`,
`    ],
  },`
);

fs.writeFileSync('types/permissions.ts', content);


let navContent = fs.readFileSync('lib/navigation-builder.ts', 'utf8');

const oldNavBuilderMenu = `  {
    label: "Purchases",
    icon: "FiShoppingCart",
    module: "purchases",
    subMenu: [
      { href: "/dashboard/purchases", label: "Purchases", icon: "FiShoppingCart", module: "purchases" },
      { href: "/dashboard/purchases/grn", label: "Goods Receipt", icon: "FiTruck", module: "purchases" },
    ],
  },
  {
    label: "Returns (RTV)",
    icon: "FiCornerUpLeft",
    module: "rtv",
    subMenu: [
      { href: "/dashboard/rtv", label: "RTV List", icon: "FiList", module: "rtv" },
    ],
  },`;

const newNavBuilderMenu = `  {
    label: "Procurements",
    icon: "FiShoppingCart",
    module: "procurements",
    subMenu: [
      { href: "/dashboard/procurements/purchases", label: "Purchases", icon: "FiShoppingCart", module: "procurements" },
      { href: "/dashboard/procurements/grn", label: "Goods Receipt", icon: "FiTruck", module: "procurements" },
      { href: "/dashboard/procurements/tpn", label: "Transfer Notes", icon: "FiNavigation", module: "procurements" },
      { href: "/dashboard/procurements/rtv", label: "Returns (RTV)", icon: "FiCornerUpLeft", module: "procurements" },
    ],
  },`;

navContent = navContent.replace(oldNavBuilderMenu, newNavBuilderMenu);

navContent = navContent.replace(
`      { 
        href: "/dashboard/inventory/tpn", 
        label: "Transfer Notes", 
        icon: "FiTruck", 
        module: "inventory" 
      },
    ],`,
`    ],`
);

navContent = navContent.replace(`"purchases": "purchases",\n    "rtv": "rtv",`, `"procurements": "procurements",`);

fs.writeFileSync('lib/navigation-builder.ts', navContent);

console.log("Done patching.");
