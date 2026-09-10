import { NAVIGATION_STRUCTURE } from "@/types/permissions";

// Menu item structure with icon as string (to be mapped on client side)
export interface MenuItemData {
  href?: string;
  label: string;
  icon: string;
  subMenu?: SubMenuItemData[];
  subMenuGroups?: SubMenuGroup[];
  module?: string;
}

export interface SubMenuItemData {
  href: string;
  label: string;
  icon: string;
  module?: string;
  permissionKey?: string;
  children?: SubMenuItemData[];
}

export interface SubMenuGroup {
  label: string;
  items: SubMenuItemData[];
}

// Master menu template - the complete menu structure
// This is the single source of truth for menu items
export const MENU_TEMPLATE: MenuItemData[] = [
  // 1. Executive
  {
    label: "Executive",
    icon: "FiActivity",
    module: "ceo-command-center",
    subMenu: [
      { href: "/dashboard", label: "Dashboard", icon: "FiHome", module: "dashboard" },
      { href: "/dashboard/ceo-command-center", label: "CEO Command Center", icon: "FiActivity", module: "ceo-command-center" },
      { href: "/dashboard/profitability", label: "Profitability", icon: "FiTrendingUp", module: "ceo-command-center" },
      { href: "/dashboard/executive/alerts", label: "Alerts", icon: "FiAlertCircle", module: "ceo-command-center" },
      { href: "/dashboard/executive/reports", label: "Reports", icon: "FiBarChart", module: "ceo-command-center" },
    ],
  },
  // 2. Marketing
  {
    label: "Marketing",
    icon: "FiPieChart",
    module: "marketing",
    subMenu: [
      { href: "/dashboard/marketing", label: "Dashboard", icon: "FiTarget", module: "marketing" },
      { href: "/dashboard/marketing/marketing-funnel", label: "Marketing Funnel", icon: "FiFilter", module: "marketing" },
      {
        href: "/dashboard/marketing/campaigns",
        label: "Campaigns",
        icon: "FiLayers",
        module: "marketing",
        children: [
          { href: "/dashboard/marketing/campaigns", label: "All Campaigns", icon: "FiLayers", module: "marketing" },
          { href: "/dashboard/marketing/paid-ads", label: "Ads Campaigns", icon: "FiDollarSign", module: "marketing" },
          { href: "/dashboard/marketing/sms-campaign", label: "SMS Campaigns", icon: "FiMessageSquare", module: "marketing" },
          { href: "/dashboard/marketing/wa-campaign", label: "WA Campaign", icon: "FiMessageSquare", module: "marketing" },
          { href: "/dashboard/marketing/email-campaigns", label: "Email Campaign", icon: "FiMail", module: "marketing" },
          { href: "/dashboard/marketing/physical-campaign", label: "Physical Campaign", icon: "FiBriefcase", module: "marketing" },
        ],
      },
      { href: "/dashboard/marketing/seo", label: "SEO", icon: "FiTrendingUp", module: "marketing" },
      { href: "/dashboard/marketing/social-media", label: "Social Media", icon: "FiShare2", module: "marketing" },
      { href: "/dashboard/marketing/content-calendar", label: "Content Calendar", icon: "FiCalendar", module: "marketing" },
      { href: "/dashboard/marketing/landing-pages", label: "Landing Page", icon: "FiFileText", module: "marketing" },
      { href: "/dashboard/marketing/roi-reports", label: "ROI", icon: "FiBarChart", module: "marketing" },
      { href: "/dashboard/marketing/lead-sources", label: "Lead Sources", icon: "FiUsers", module: "marketing" },
      { href: "/dashboard/marketing/budget", label: "Campaign Budget", icon: "FiCreditCard", module: "marketing" },
      { href: "/dashboard/marketing/expenses", label: "Marketing Expenses", icon: "FiDollarSign", module: "marketing" },
      { href: "/dashboard/marketing/attribution", label: "Attribution", icon: "FiActivity", module: "marketing" },
    ],
  },
  // 3. Creatives
  {
    label: "Creatives",
    icon: "FiImage",
    module: "creatives",
    subMenu: [
      { href: "/dashboard/creatives", label: "Creative Dashboard", icon: "FiTarget", module: "creatives" },
      { href: "/dashboard/creatives/design-requests", label: "Design Requests", icon: "FiFileText", module: "creatives" },
      { href: "/dashboard/creatives/ui-ux-tasks", label: "UI/UX Tasks", icon: "FiLayers", module: "creatives" },
      { href: "/dashboard/creatives/graphics-tasks", label: "Graphics Tasks", icon: "FiImage", module: "creatives" },
      { href: "/dashboard/creatives/video-motion-tasks", label: "Video/Motion Tasks", icon: "FiVideo", module: "creatives" },
      { href: "/dashboard/creatives/brand-assets", label: "Brand Assets", icon: "FiFolder", module: "creatives" },
      { href: "/dashboard/creatives/revisions", label: "Revision Management", icon: "FiClock", module: "creatives" },
      { href: "/dashboard/creatives/internal-approval", label: "Internal Approval", icon: "FiCheckCircle", module: "creatives" },
      { href: "/dashboard/creatives/client-approval", label: "Client Approval", icon: "FiUserCheck", module: "creatives" },
      { href: "/dashboard/creatives/library", label: "Creative Library", icon: "FiArchive", module: "creatives" },
    ],
  },
  // 4. CRM
  {
    label: "CRM",
    icon: "FiUsers",
    module: "crm",
    subMenu: [
      { href: "/dashboard/crm", label: "CRM Dashboard", icon: "FiTarget", module: "crm" },
      { href: "/dashboard/crm/leads", label: "Leads", icon: "FiTarget", module: "crm" },
      { href: "/dashboard/crm/opportunities", label: "Opportunities", icon: "FiTrendingUp", module: "crm" },
      { href: "/dashboard/crm/contacts", label: "Contacts", icon: "FiUser", module: "crm" },
      { href: "/dashboard/crm/activities", label: "Activities", icon: "FiActivity", module: "crm" },
      { href: "/dashboard/crm/follow-ups", label: "Follow-ups", icon: "FiClock", module: "crm" },
      { href: "/dashboard/crm/pipeline", label: "Pipeline", icon: "FiLayers", module: "crm" },
    ],
  },
  // 5. Sales
  {
    label: "Sales",
    icon: "FiDollarSign",
    module: "quotations",
    subMenu: [
      { href: "/dashboard/sales", label: "Sales Dashboard", icon: "FiBarChart", module: "quotations" },
      { href: "/dashboard/crm/requirements", label: "Requirements", icon: "FiFileText", module: "crm" },
      { href: "/dashboard/crm/estimations", label: "Internal Estimations", icon: "SlCalculator", module: "crm" },
      { href: "/dashboard/quotations", label: "Quotations", icon: "FiFileText", module: "quotations" },
      { href: "/dashboard/crm/agreements", label: "Agreements", icon: "FiFileText", module: "crm" },
      { href: "/dashboard/crm/service-sales", label: "Service Sales", icon: "FiShoppingCart", module: "crm" },
      { href: "/dashboard/quotations/orders", label: "Work Orders", icon: "FiPackage", module: "quotations" },
      { href: "/dashboard/crm/project-handovers", label: "Project Handovers", icon: "FiBriefcase", module: "crm" },
    ],
  },
  // 6. Clients
  {
    label: "Clients",
    icon: "FiUserCheck",
    module: "peoples",
    subMenu: [
      { href: "/dashboard/crm/clients", label: "All Clients", icon: "FiUsers", module: "peoples" },
      { href: "/dashboard/clients/details", label: "Client 360", icon: "FiUser", module: "peoples" },
      { href: "/dashboard/clients/portal-users", label: "Portal Users", icon: "FiKey", module: "peoples" },
      { href: "/dashboard/clients/activity", label: "Client Activity", icon: "FiActivity", module: "peoples" },
    ],
  },
  // 7. Projects
  {
    label: "Projects",
    icon: "FiBriefcase",
    module: "projects",
    subMenu: [
      { href: "/dashboard/projects", label: "PM Dashboard", icon: "FiTarget", module: "projects" },
      { href: "/dashboard/projects/intake", label: "Project Intake", icon: "FiInbox", module: "projects" },
      { href: "/dashboard/projects/planning", label: "Project Planning", icon: "FiLayers", module: "projects" },
      { href: "/dashboard/projects/milestone", label: "Milestones", icon: "FiCheckSquare", module: "projects" },
      { href: "/dashboard/projects/resource-allocation", label: "Resource Allocation", icon: "FiUsers", module: "projects" },
      { href: "/dashboard/projects/wbs", label: "Work Breakdown", icon: "FiGrid", module: "projects" },
      { href: "/dashboard/projects/gantt", label: "Timeline/Gantt", icon: "FiCalendar", module: "projects" },
      { href: "/dashboard/projects/dependencies", label: "Dependencies", icon: "FiShare2", module: "projects" },
      { href: "/dashboard/projects/risks", label: "Risk Register", icon: "FiAlertTriangle", module: "projects" },
      { href: "/dashboard/projects/meetings", label: "Client Meetings", icon: "FiVideo", module: "projects" },
      { href: "/dashboard/projects/change-requests", label: "Change Requests", icon: "FiFileText", module: "projects" },
      { href: "/dashboard/projects/client-approvals", label: "Client Approvals", icon: "FiUserCheck", module: "projects" },
      { href: "/dashboard/projects/billing-readiness", label: "Billing Readiness", icon: "FiDollarSign", module: "projects" },
      { href: "/dashboard/projects/closure", label: "Project Closure", icon: "FiArchive", module: "projects" },
    ],
  },
  // 8. QA
  {
    label: "QA",
    icon: "FiCheckCircle",
    module: "qa",
    subMenu: [
      { href: "/dashboard/qa", label: "QA Dashboard", icon: "FiTarget", module: "qa" },
      { href: "/dashboard/qa/test-plans", label: "Test Plans", icon: "FiFileText", module: "qa" },
      { href: "/dashboard/qa/test-cases", label: "Test Cases", icon: "FiCheckSquare", module: "qa" },
      { href: "/dashboard/qa/test-suites", label: "Test Suites", icon: "FiLayers", module: "qa" },
      { href: "/dashboard/qa/test-runs", label: "Test Runs", icon: "FiPlay", module: "qa" },
      { href: "/dashboard/qa/bugs", label: "Bugs", icon: "FiAlertCircle", module: "qa" },
      { href: "/dashboard/qa/regression", label: "Regression", icon: "FiRefreshCw", module: "qa" },
      { href: "/dashboard/qa/uat", label: "UAT", icon: "FiUserCheck", module: "qa" },
      { href: "/dashboard/qa/release-checklist", label: "Release Checklist", icon: "FiList", module: "qa" },
      { href: "/dashboard/qa/release-approval", label: "Release Approval", icon: "FiShield", module: "qa" },
    ],
  },
  // 9. Customer Success
  {
    label: "Customer Success",
    icon: "FiHelpCircle",
    module: "support",
    subMenu: [
      { href: "/dashboard/support", label: "Support Dashboard", icon: "FiTarget", module: "support" },
      { href: "/dashboard/support/tickets", label: "All Tickets", icon: "FiInbox", module: "support" },
      { href: "/dashboard/support/my-tickets", label: "My Tickets", icon: "FiUser", module: "support" },
      { href: "/dashboard/support/sla-warnings", label: "SLA Warnings", icon: "FiAlertTriangle", module: "support" },
      { href: "/dashboard/support/sla-breaches", label: "SLA Breaches", icon: "FiAlertCircle", module: "support" },
      { href: "/dashboard/support/escalations", label: "Escalations", icon: "FiTrendingUp", module: "support" },
      { href: "/dashboard/support/renewals", label: "Renewals", icon: "FiRefreshCw", module: "support" },
      { href: "/dashboard/support/upsell-opportunities", label: "Upsell Opportunities", icon: "FiDollarSign", module: "support" },
    ],
  },
  // 10. Billing
  {
    label: "Billing",
    icon: "FiCreditCard",
    module: "billing",
    subMenu: [
      { href: "/dashboard/billing", label: "Billing Dashboard", icon: "FiTarget", module: "billing" },
      { href: "/dashboard/billing/plans", label: "Billing Plans", icon: "FiLayers", module: "billing" },
      { href: "/dashboard/billing/milestones", label: "Billing Milestones", icon: "FiCheckSquare", module: "billing" },
      { href: "/dashboard/billing/billable", label: "Billable", icon: "FiDollarSign", module: "billing" },
      { href: "/dashboard/billing/invoiced-milestones", label: "Invoiced Milestones", icon: "FiFileText", module: "billing" },
    ],
  },
  // 11. Finance
  {
    label: "Finance",
    icon: "SlCalculator",
    module: "accounts",
    subMenuGroups: [
      {
        label: "Finance Dashboard",
        items: [
          { href: "/dashboard/accounts", label: "Overview", icon: "FiBarChart", module: "accounts" },
        ],
      },
      {
        label: "Receivables",
        items: [
          { href: "/dashboard/quotations/invoices", label: "Invoices", icon: "FiFileText", module: "quotations" },
          { href: "/dashboard/accounts/accounts-receivable", label: "Accounts Receivable", icon: "FiArrowDownRight", module: "accounts" },
          { href: "/dashboard/accounts/collections", label: "Collections", icon: "FiDollarSign", module: "accounts" },
        ],
      },
      {
        label: "Payables",
        items: [
          { href: "/dashboard/accounts/accounts-payable", label: "Accounts Payable", icon: "FiArrowUpRight", module: "accounts" },
        ],
      },
      {
        label: "General Ledger",
        items: [
          { href: "/dashboard/accounts/chart-of-accounts", label: "Chart of Accounts", icon: "FiBarChart", module: "accounts" },
          { href: "/dashboard/accounts/vouchers", label: "Vouchers", icon: "FiFile", module: "accounts" },
          { href: "/dashboard/accounts/journal-entries", label: "Journal Entries", icon: "FiBookOpen", module: "accounts" },
          { href: "/dashboard/accounts/ledgers", label: "Ledgers", icon: "FiBook", module: "accounts" },
        ],
      },
      {
        label: "Treasury",
        items: [
          { href: "/dashboard/accounts/cash-bank", label: "Cash & Bank", icon: "FiCreditCard", module: "accounts" },
        ],
      },
      {
        label: "Fixed Assets",
        items: [
          { href: "/dashboard/accounts/fixed-assets", label: "Asset Register", icon: "FiPackage", module: "accounts" },
          { href: "/dashboard/accounts/fixed-assets/capitalization", label: "Capitalization", icon: "FiPlusSquare", module: "accounts" },
          { href: "/dashboard/accounts/fixed-assets/depreciation", label: "Depreciation", icon: "FiTrendingDown", module: "accounts" },
          { href: "/dashboard/accounts/fixed-assets/transfers", label: "Transfers", icon: "FiRepeat", module: "accounts" },
          { href: "/dashboard/accounts/fixed-assets/disposals", label: "Disposals", icon: "FiTrash2", module: "accounts" },
        ],
      },
      {
        label: "Reports",
        items: [
          { href: "/dashboard/accounts/trial-balance", label: "Trial Balance", icon: "FiActivity", module: "accounts" },
          { href: "/dashboard/accounts/profit-loss", label: "Profit & Loss", icon: "FiTrendingUp", module: "accounts" },
          { href: "/dashboard/accounts/balance-sheet", label: "Balance Sheet", icon: "FiFileText", module: "accounts" },
        ],
      },
    ],
  },
  // 12. Services & Catalog
  {
    label: "Services & Catalog",
    icon: "FiArchive",
    module: "items",
    subMenu: [
      { href: "/dashboard/items", label: "Services", icon: "FiPackage", module: "items" },
      { href: "/dashboard/items/groups", label: "Groups", icon: "FiLayers", module: "items" },
      { href: "/dashboard/items/category", label: "Categories", icon: "MdOutlineCategory", module: "items" },
      { href: "/dashboard/items/units", label: "Units", icon: "FiLayers", module: "items" },
    ],
  },
  // 13. People & HR
  {
    label: "People & HR",
    icon: "FiBriefcase",
    module: "hr",
    subMenu: [
      { href: "/dashboard/employees", label: "Employees", icon: "FiUser", module: "peoples" },
      { href: "/dashboard/hr/departments", label: "Departments", icon: "FiLayers", module: "hr" },
      { href: "/dashboard/hr/attendance", label: "Attendance", icon: "FiClock", module: "hr" },
      { href: "/dashboard/hr/shifts", label: "Shifts", icon: "FiLayers", module: "hr" },
      { href: "/dashboard/hr/holidays", label: "Holidays", icon: "FiCalendar", module: "hr" },
      { href: "/dashboard/hr/leave", label: "Leave", icon: "FiFileText", module: "hr" },
      { href: "/dashboard/hr/payroll", label: "Payroll", icon: "FiDollarSign", module: "hr" },
      { href: "/dashboard/hr/loans", label: "Loans", icon: "FiCreditCard", module: "hr" },
      { href: "/dashboard/hr/calendar", label: "HR Calendar", icon: "FiCalendar", module: "hr" },
      { href: "/dashboard/hr/attendance/devices", label: "Biometric", icon: "FiServer", module: "hr" },
    ],
  },
  // 14. Governance
  {
    label: "Governance",
    icon: "FiShield",
    module: "governance",
    subMenu: [
      { href: "/dashboard/approvals", label: "Approval Inbox", icon: "FiInbox", module: "governance" },
      { href: "/dashboard/approvals/my-requests", label: "My Requests", icon: "FiSend", module: "governance" },
      { href: "/dashboard/settings/approval-policies", label: "Approval Policies", icon: "FiSliders", module: "governance" },
      { href: "/dashboard/governance/change-requests", label: "Change Requests", icon: "FiFileText", module: "governance" },
      { href: "/dashboard/governance/commercial-amendments", label: "Commercial Amendments", icon: "FiDollarSign", module: "governance" },
      { href: "/dashboard/system/logs", label: "Audit Logs", icon: "FiActivity", module: "governance" },
    ],
  },
  // 15. Productivity
  {
    label: "Productivity",
    icon: "FiFolder",
    module: "productivity",
    subMenu: [
      { href: "/dashboard/files", label: "Files", icon: "FiFolder", module: "files" },
      { href: "/dashboard/notes", label: "Notes", icon: "FiFileText", module: "notes" },
      { href: "/dashboard/docs", label: "Docs", icon: "FiFile", module: "docs" },
      { href: "/dashboard/notifications", label: "Notifications", icon: "FiBell", module: "notifications" },
    ],
  },
  // 16. System Operations
  {
    label: "System Operations",
    icon: "FiServer",
    module: "system",
    subMenu: [
      { href: "/dashboard/system/tasks", label: "Queue Jobs", icon: "FiList", module: "system" },
      { href: "/dashboard/system/workers", label: "Workers", icon: "FiCpu", module: "system" },
      { href: "/dashboard/system/storage", label: "Storage", icon: "FiDatabase", module: "system" },
      { href: "/dashboard/system/redis", label: "Redis", icon: "FiZap", module: "system" },
      { href: "/dashboard/admin/settings", label: "Backups", icon: "FiHardDrive", module: "system" },
      { href: "/dashboard/system/health", label: "Health", icon: "FiHeart", module: "system" },
    ],
  },
  // 17. Administration
  {
    label: "Administration",
    icon: "FiSettings",
    module: "admin",
    subMenu: [
      { href: "/dashboard/users", label: "Users", icon: "FiUsers", module: "peoples" },
    ],
  },
];

export const BOTTOM_MENU_TEMPLATE: MenuItemData[] = [
  { href: "/dashboard/profile", label: "Profile", icon: "FiUser" },
  { href: "/dashboard/settings", label: "Settings", icon: "FiSettings" },
];

/**
 * Map menu item href path to permission key
 * This function extracts the permission key from a menu item path
 */
export function getPermissionKeyFromPath(path: string): string | null {
  // Normalize path (remove query params, trailing slashes)
  const normalizedPath = path.split("?")[0].replace(/\/$/, "") || "/";
  
  // Handle dashboard root path first
  if (normalizedPath === "/dashboard") {
    return "dashboard";
  }
  
  // Search through NAVIGATION_STRUCTURE to find matching page
  // We need to check exact matches first, then prefix matches
  // IMPORTANT: Don't match /dashboard as a prefix for other paths
  let prefixMatch: string | null = null;
  let prefixMatchPath: string | null = null;
  
  for (const navItem of NAVIGATION_STRUCTURE) {
    for (const page of navItem.pages) {
      const pagePath = page.path.split("?")[0].replace(/\/$/, "") || "/";
      
      // Skip /dashboard when checking prefix matches (it would match everything)
      if (pagePath === "/dashboard") {
        continue;
      }
      
      // Exact match - return immediately
      if (pagePath === normalizedPath) {
        return page.permissionKey;
      }
      
      // Check if path starts with page path (for nested routes)
      // Keep track of the longest matching path to get the most specific match
      if (normalizedPath.startsWith(pagePath + "/")) {
        if (!prefixMatchPath || pagePath.length > prefixMatchPath.length) {
          prefixMatch = page.permissionKey;
          prefixMatchPath = pagePath;
        }
      }
    }
  }
  
  // If we found a prefix match, return it
  if (prefixMatch) {
    return prefixMatch;
  }
  
  // Fallback: try to extract from path structure
  // e.g., "/dashboard/items/groups" -> "items.groups"
  if (normalizedPath.startsWith("/dashboard/")) {
    const pathWithoutDashboard = normalizedPath.replace("/dashboard/", "");
    const pathParts = pathWithoutDashboard.split("/").filter(Boolean);
    
    if (pathParts.length >= 2) {
      // e.g., ["items", "groups"] -> "items.groups"
      const moduleName = pathParts[0];
      const subModule = pathParts[1];
      return `${moduleName}.${subModule}`;
    } else if (pathParts.length === 1) {
      const moduleName = pathParts[0];
      
      // Check if it's a direct module page
      if (["files", "notifications", "profile", "settings"].includes(moduleName)) {
        return moduleName;
      }
      
      // For items, quotations, accounts, peoples - find the main page
      for (const navItem of NAVIGATION_STRUCTURE) {
        if (navItem.id === moduleName) {
          const matchingPage = navItem.pages.find((p) => {
            const pPath = p.path.split("?")[0].replace(/\/$/, "") || "/";
            return pPath === normalizedPath || normalizedPath.startsWith(pPath + "/");
          });
          if (matchingPage) {
            return matchingPage.permissionKey;
          }
          if (navItem.pages.length > 0) {
            return navItem.pages[0].permissionKey;
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Map menu items to navigation IDs
 */
function getNavigationIdForMenuItem(item: MenuItemData): string | null {
  const navMap: Record<string, string> = {
    "/dashboard": "dashboard",
    "items": "items",
    "quotations": "quotations",
    "purchases": "purchases",
    "work-orders": "work-orders",
    "accounts": "accounts",
    "peoples": "peoples",
    "hr": "hr",
    "projects": "projects",
    "/dashboard/projects": "projects",
    "/dashboard/files": "files",
    "/dashboard/notifications": "notifications",
    "/dashboard/analytics": "analytics",
    "/dashboard/reports": "reports",
  };
  
  if (item.href) {
    return navMap[item.href] || null;
  }
  if (item.module) {
    return navMap[item.module] || item.module;
  }
  return null;
}

/**
 * Build filtered menu structure based on user permissions
 * This is the main function that filters the menu template
 * 
 * @param accessiblePages - Map of permission keys to boolean (true = accessible)
 * @param visibleNavigations - Set of visible navigation IDs
 * @returns Object with filtered main menu and bottom menu items
 */
export function buildFilteredMenu(
  accessiblePages: Map<string, boolean>,
  visibleNavigations: Set<string>
): { mainMenu: MenuItemData[]; bottomMenu: MenuItemData[] } {
  
  // Check if user has no permissions (only dashboard and profile accessible)
  const hasNoPermissions = 
    visibleNavigations.size === 2 &&
    visibleNavigations.has("dashboard") &&
    visibleNavigations.has("profile") &&
    accessiblePages.size === 2 &&
    accessiblePages.has("dashboard") &&
    accessiblePages.has("profile");
  
  let filteredMainMenu: MenuItemData[];
  let filteredBottomMenu: MenuItemData[];
  
  if (hasNoPermissions) {
    // User has no permissions - only show Dashboard and Profile
    filteredMainMenu = MENU_TEMPLATE.filter((item) => {
      const navId = getNavigationIdForMenuItem(item);
      return navId === "dashboard";
    });
    
    filteredBottomMenu = BOTTOM_MENU_TEMPLATE.filter(
      (item) => item.href === "/dashboard/profile"
    );
  } else {
    // User has permissions - filter based on access
    filteredMainMenu = MENU_TEMPLATE.map((item) => {
      // Deep copy the item
      const itemCopy: MenuItemData = {
        ...item,
        subMenu: item.subMenu ? [...item.subMenu] : undefined,
        subMenuGroups: item.subMenuGroups ? item.subMenuGroups.map(group => ({
          ...group,
          items: [...group.items]
        })) : undefined,
      };
      
      const navId = getNavigationIdForMenuItem(item);
      
      // Filter submenus based on permissions
      if (itemCopy.subMenu) {
        itemCopy.subMenu = itemCopy.subMenu
          .map((subItem) => {
            if (subItem.children && subItem.children.length > 0) {
              const filteredChildren = subItem.children.filter((child) => {
                const childKey = getPermissionKeyFromPath(child.href);
                if (!childKey) return false;
                return accessiblePages.get(childKey) === true;
              });

              const parentKey = getPermissionKeyFromPath(subItem.href);
              const parentAccess = parentKey ? accessiblePages.get(parentKey) === true : false;

              if (filteredChildren.length > 0 || parentAccess) {
                return { ...subItem, children: filteredChildren };
              }
              return null;
            }

            const permissionKey = getPermissionKeyFromPath(subItem.href);
            if (!permissionKey) return null;
            return accessiblePages.get(permissionKey) === true ? subItem : null;
          })
          .filter((subItem): subItem is SubMenuItemData => subItem !== null);

        // If no accessible submenu items, hide the parent menu item
        if (itemCopy.subMenu.length === 0) {
          return null;
        }
      }
      
      // Filter submenu groups based on permissions
      if (itemCopy.subMenuGroups) {
        itemCopy.subMenuGroups = itemCopy.subMenuGroups.map((group) => {
          // Filter items within each group
          const filteredItems = group.items.filter((subItem) => {
            const permissionKey = getPermissionKeyFromPath(subItem.href);
            
            if (!permissionKey) {
              return false;
            }
            
            const hasAccess = accessiblePages.get(permissionKey);
            
            // Only show if explicitly set to true
            return hasAccess === true;
          });
          
          return {
            ...group,
            items: filteredItems,
          };
        }).filter((group) => group.items.length > 0); // Remove empty groups
        
        // If no accessible groups, hide the parent menu item
        if (itemCopy.subMenuGroups.length === 0) {
          return null;
        }
      }
      
      // Check navigation visibility
      if (!navId) {
        return itemCopy;
      }
      
      // Check if navigation is always visible
      const navItem = NAVIGATION_STRUCTURE.find((nav) => nav.id === navId);
      if (navItem?.alwaysVisible) {
        return itemCopy;
      }
      
      // Check if navigation is in visible set
      if (!visibleNavigations.has(navId)) {
        return null;
      }
      
      // For items without sub-menu, check page access
      if (itemCopy.href) {
        const permissionKey = getPermissionKeyFromPath(itemCopy.href);
        if (permissionKey) {
          const hasAccess = accessiblePages.get(permissionKey);
          if (hasAccess !== true) {
            return null;
          }
        }
      }
      
      return itemCopy;
    }).filter((item): item is MenuItemData => item !== null);
    
    // Filter bottom menu (Settings requires permissions)
    filteredBottomMenu = BOTTOM_MENU_TEMPLATE;
  }
  
  return {
    mainMenu: filteredMainMenu,
    bottomMenu: filteredBottomMenu,
  };
}
