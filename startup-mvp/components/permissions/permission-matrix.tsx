"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  NAVIGATION_STRUCTURE,
  OPERATIONS,
} from "@/types/permissions";
import type {
  EnhancedPermissions,
  PagePermission,
  Operation,
} from "@/types/permissions";
import {
  FiChevronDown,
  FiChevronRight,
} from "react-icons/fi";
import { cn } from "@/lib/utils";

interface PermissionMatrixProps {
  permissions: Partial<EnhancedPermissions>;
  onChange: (permissions: Partial<EnhancedPermissions>) => void;
  disabled?: boolean;
}

export default function PermissionMatrix({
  permissions,
  onChange,
  disabled = false,
}: PermissionMatrixProps) {
  const [expandedNavigations, setExpandedNavigations] = useState<Set<string>>(
    new Set()
  );
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());

  const toggleNavigation = (navId: string) => {
    const newExpanded = new Set(expandedNavigations);
    if (newExpanded.has(navId)) {
      newExpanded.delete(navId);
    } else {
      newExpanded.add(navId);
    }
    setExpandedNavigations(newExpanded);
  };

  const togglePage = (pageKey: string) => {
    const newExpanded = new Set(expandedPages);
    if (newExpanded.has(pageKey)) {
      newExpanded.delete(pageKey);
    } else {
      newExpanded.add(pageKey);
    }
    setExpandedPages(newExpanded);
  };

  const getPagePermission = (permissionKey: string): PagePermission | null => {
    return (permissions[permissionKey] as PagePermission) || null;
  };

  const hasNavigationPermission = (navId: string): boolean => {
    const navItem = NAVIGATION_STRUCTURE.find((nav) => nav.id === navId);
    if (!navItem) return false;
    
    // Always visible items are always checked
    if (navItem.alwaysVisible) return true;
    
    // Check if any page has navigation visible
    return navItem.pages.some((page) => {
      const pagePerm = getPagePermission(page.permissionKey);
      return pagePerm?.navigationVisible === true;
    });
  };


  const handleNavigationToggle = (
    navId: string,
    checked: boolean
  ) => {
    const navItem = NAVIGATION_STRUCTURE.find((nav) => nav.id === navId);
    if (!navItem || navItem.alwaysVisible) return;

    const newPermissions = { ...permissions };

    for (const page of navItem.pages) {
      if (checked) {
        // Select parent: enable all children with all operations
        newPermissions[page.permissionKey] = {
          navigationVisible: true,
          pageAccess: true,
          operations: [...(page.operations as Operation[])],
        };
      } else {
        // Deselect parent: clear all children
        newPermissions[page.permissionKey] = {
          navigationVisible: false,
          pageAccess: false,
          operations: [],
        };
      }
    }

    onChange(newPermissions);
  };

  const handlePageToggle = (
    permissionKey: string,
    checked: boolean,
    availableOperations: Operation[]
  ) => {
    const newPermissions = { ...permissions };
    const current = getPagePermission(permissionKey);

    if (checked) {
      // Select page: enable with all operations
      newPermissions[permissionKey] = {
        navigationVisible: current?.navigationVisible ?? true,
        pageAccess: true,
        operations: [...availableOperations],
      };
    } else {
      // Deselect page: clear all operations and hide from navigation
      newPermissions[permissionKey] = {
        navigationVisible: false,
        pageAccess: false,
        operations: [],
      };
    }

    onChange(newPermissions);
  };

  const handleOperationToggle = (
    permissionKey: string,
    operation: Operation,
    checked: boolean
  ) => {
    const newPermissions = { ...permissions };
    const current = getPagePermission(permissionKey);
    const currentOps = current?.operations ?? [];

    const newOps = checked
      ? [...new Set([...currentOps, operation])]
      : currentOps.filter((op) => op !== operation);

    // If no operations are selected, hide from navigation
    // If operations exist, keep navigationVisible as is (or default to true)
    const hasOperations = newOps.length > 0;

    newPermissions[permissionKey] = {
      navigationVisible: hasOperations ? (current?.navigationVisible ?? true) : false,
      pageAccess: hasOperations,
      operations: newOps,
    };

    onChange(newPermissions);
  };

  // Settings category mapping
  const settingsCategories = {
    "Settings": [
      "settings.organization",
      "settings.experience",
      "settings.backup",
      "settings.permissions",
    ],
    "Accounts": [
      "settings.accounts.default",
      "settings.accounts.tax",
      "settings.accounts.payment-methods",
      "settings.preferences",
    ],
    "Quotations": [
      "settings.coverLetter",
      "settings.tos",
    ],
    "Notifications": [
      "settings.general",
      "settings.members",
      "settings.security",
    ],
    "Developers": [
      "settings.apis",
      "settings.webhooks",
    ],
  };

  // Accounts submenu items (children of Accounts in Settings category)
  const accountsSubmenu = [
    "settings.accounts",
    "settings.emails",
    "settings.calendars",
    "settings.whatsapp",
    "settings.telegram",
    "settings.sms",
  ];

  const [expandedSettingsCategories, setExpandedSettingsCategories] = useState<Set<string>>(
    new Set()
  );
  const [expandedAccountsSubmenu, setExpandedAccountsSubmenu] = useState<boolean>(false);

  const toggleSettingsCategory = (category: string) => {
    const newExpanded = new Set(expandedSettingsCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedSettingsCategories(newExpanded);
  };

  const toggleAccountsSubmenu = () => {
    setExpandedAccountsSubmenu(!expandedAccountsSubmenu);
  };

  const hasSettingsCategoryPermission = (category: string): boolean => {
    const pageKeys = settingsCategories[category as keyof typeof settingsCategories] || [];
    return pageKeys.some((key) => {
      const pagePerm = getPagePermission(key);
      return pagePerm?.navigationVisible === true;
    });
  };

  const hasAccountsSubmenuPermission = (): boolean => {
    return accountsSubmenu.some((key) => {
      const pagePerm = getPagePermission(key);
      return pagePerm?.navigationVisible === true;
    });
  };

  const handleAccountsSubmenuToggle = (checked: boolean) => {
    const newPermissions = { ...permissions };

    for (const pageKey of accountsSubmenu) {
      const navItem = NAVIGATION_STRUCTURE.find((nav) => nav.id === "settings");
      const page = navItem?.pages.find((p) => p.permissionKey === pageKey);
      if (!page) continue;

      if (checked) {
        newPermissions[pageKey] = {
          navigationVisible: true,
          pageAccess: true,
          operations: [...(page.operations as Operation[])],
        };
      } else {
        newPermissions[pageKey] = {
          navigationVisible: false,
          pageAccess: false,
          operations: [],
        };
      }
    }

    onChange(newPermissions);
  };

  const handleSettingsCategoryToggle = (category: string, checked: boolean) => {
    const pageKeys = settingsCategories[category as keyof typeof settingsCategories] || [];
    const newPermissions = { ...permissions };

    for (const pageKey of pageKeys) {
      const navItem = NAVIGATION_STRUCTURE.find((nav) => nav.id === "settings");
      const page = navItem?.pages.find((p) => p.permissionKey === pageKey);
      if (!page) continue;

      if (checked) {
        newPermissions[pageKey] = {
          navigationVisible: true,
          pageAccess: true,
          operations: [...(page.operations as Operation[])],
        };
      } else {
        newPermissions[pageKey] = {
          navigationVisible: false,
          pageAccess: false,
          operations: [],
        };
      }
    }

    onChange(newPermissions);
  };

  const renderSettingsPages = (navItem: typeof NAVIGATION_STRUCTURE[0]) => {
    return (
      <div className="mt-3 space-y-2 pl-8">
        {Object.entries(settingsCategories).map(([category, pageKeys]) => {
          const isCategoryExpanded = expandedSettingsCategories.has(category);
          const hasCategoryPermission = hasSettingsCategoryPermission(category);
          const categoryPages = navItem.pages.filter((page) =>
            pageKeys.includes(page.permissionKey)
          );

          // Special handling for Settings category - add Accounts submenu
          const isSettingsCategory = category === "Settings";
          const accountsSubmenuPages = isSettingsCategory
            ? navItem.pages.filter((page) => accountsSubmenu.includes(page.permissionKey))
            : [];

          return (
            <div
              key={category}
              className={cn(
                "border rounded-lg p-3",
                hasCategoryPermission || (isSettingsCategory && hasAccountsSubmenuPermission())
                  ? "bg-muted/30"
                  : ""
              )}
            >
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSettingsCategory(category)}
                  className="h-6 w-6 p-0"
                >
                  {isCategoryExpanded ? (
                    <FiChevronDown className="h-3 w-3" />
                  ) : (
                    <FiChevronRight className="h-3 w-3" />
                  )}
                </Button>
                <Checkbox
                  id={`settings-category-${category}`}
                  checked={hasCategoryPermission}
                  onCheckedChange={(checked) =>
                    handleSettingsCategoryToggle(category, checked as boolean)
                  }
                  disabled={disabled}
                />
                <Label
                  htmlFor={`settings-category-${category}`}
                  className="text-sm font-medium cursor-pointer flex-1"
                >
                  {category}
                </Label>
              </div>
              {isCategoryExpanded && (
                <div className="mt-3 space-y-2 pl-8">
                  {/* Accounts submenu for Settings category */}
                  {isSettingsCategory && accountsSubmenuPages.length > 0 && (
                    <div
                      className={cn(
                        "border rounded p-3",
                        hasAccountsSubmenuPermission() ? "bg-muted/20" : ""
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleAccountsSubmenu}
                          className="h-6 w-6 p-0"
                        >
                          {expandedAccountsSubmenu ? (
                            <FiChevronDown className="h-3 w-3" />
                          ) : (
                            <FiChevronRight className="h-3 w-3" />
                          )}
                        </Button>
                        <Checkbox
                          id="settings-accounts-submenu"
                          checked={hasAccountsSubmenuPermission()}
                          onCheckedChange={(checked) =>
                            handleAccountsSubmenuToggle(checked as boolean)
                          }
                          disabled={disabled}
                        />
                        <Label
                          htmlFor="settings-accounts-submenu"
                          className="text-sm font-medium cursor-pointer flex-1"
                        >
                          Accounts
                        </Label>
                      </div>
                      {expandedAccountsSubmenu && (
                        <div className="mt-3 space-y-2 pl-8">
                          {accountsSubmenuPages.map((page) => {
                            const pagePerm = getPagePermission(page.permissionKey);
                            const isPageExpanded = expandedPages.has(page.permissionKey);
                            const hasPageAccess = pagePerm?.pageAccess ?? false;

                            return (
                              <div
                                key={page.permissionKey}
                                className={cn(
                                  "border rounded p-3",
                                  hasPageAccess ? "bg-muted/10" : ""
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => togglePage(page.permissionKey)}
                                    className="h-6 w-6 p-0"
                                  >
                                    {isPageExpanded ? (
                                      <FiChevronDown className="h-3 w-3" />
                                    ) : (
                                      <FiChevronRight className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Checkbox
                                    id={`page-${page.permissionKey}`}
                                    checked={hasPageAccess}
                                    onCheckedChange={(checked) =>
                                      handlePageToggle(
                                        page.permissionKey,
                                        checked as boolean,
                                        page.operations
                                      )
                                    }
                                    disabled={disabled}
                                  />
                                  <Label
                                    htmlFor={`page-${page.permissionKey}`}
                                    className="text-sm cursor-pointer flex-1"
                                  >
                                    {page.label}
                                  </Label>
                                </div>
                                {isPageExpanded && (
                                  <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 pl-8">
                                    {page.operations.map((operation) => {
                                      const operationId = operation as Operation;
                                      const isChecked =
                                        pagePerm?.operations.includes(operationId) ??
                                        false;
                                      const operationMeta = OPERATIONS[operationId];

                                      return (
                                        <div
                                          key={operationId}
                                          className="flex items-center space-x-2"
                                        >
                                          <Checkbox
                                            id={`${page.permissionKey}-${operationId}`}
                                            checked={isChecked}
                                            onCheckedChange={(checked) =>
                                              handleOperationToggle(
                                                page.permissionKey,
                                                operationId,
                                                checked as boolean
                                              )
                                            }
                                            disabled={disabled}
                                          />
                                          <Label
                                            htmlFor={`${page.permissionKey}-${operationId}`}
                                            className="text-xs cursor-pointer"
                                          >
                                            {operationMeta?.label || operationId}
                                          </Label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Regular category pages */}
                  {categoryPages.map((page) => {
                    const pagePerm = getPagePermission(page.permissionKey);
                    const isPageExpanded = expandedPages.has(page.permissionKey);
                    const hasPageAccess = pagePerm?.pageAccess ?? false;

                    return (
                      <div
                        key={page.permissionKey}
                        className={cn(
                          "border rounded p-3",
                          hasPageAccess ? "bg-muted/20" : ""
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePage(page.permissionKey)}
                            className="h-6 w-6 p-0"
                          >
                            {isPageExpanded ? (
                              <FiChevronDown className="h-3 w-3" />
                            ) : (
                              <FiChevronRight className="h-3 w-3" />
                            )}
                          </Button>
                          <Checkbox
                            id={`page-${page.permissionKey}`}
                            checked={hasPageAccess}
                            onCheckedChange={(checked) =>
                              handlePageToggle(
                                page.permissionKey,
                                checked as boolean,
                                page.operations
                              )
                            }
                            disabled={disabled}
                          />
                          <Label
                            htmlFor={`page-${page.permissionKey}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {page.label}
                          </Label>
                        </div>
                        {isPageExpanded && (
                          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 pl-8">
                            {page.operations.map((operation) => {
                              const operationId = operation as Operation;
                              const isChecked =
                                pagePerm?.operations.includes(operationId) ??
                                false;
                              const operationMeta = OPERATIONS[operationId];

                              return (
                                <div
                                  key={operationId}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={`${page.permissionKey}-${operationId}`}
                                    checked={isChecked}
                                    onCheckedChange={(checked) =>
                                      handleOperationToggle(
                                        page.permissionKey,
                                        operationId,
                                        checked as boolean
                                      )
                                    }
                                    disabled={disabled}
                                  />
                                  <Label
                                    htmlFor={`${page.permissionKey}-${operationId}`}
                                    className="text-xs cursor-pointer"
                                  >
                                    {operationMeta?.label || operationId}
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {NAVIGATION_STRUCTURE.map((navItem) => {
        const isNavExpanded = expandedNavigations.has(navItem.id);
        const hasNavPermission = hasNavigationPermission(navItem.id);
        const isSettings = navItem.id === "settings";

        return (
          <div
            key={navItem.id}
            className={cn(
              "border rounded-lg p-4",
              hasNavPermission ? "bg-muted/50" : ""
            )}
          >
            <div className="flex items-center gap-3">
              {navItem.pages.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleNavigation(navItem.id)}
                  className="h-7 w-7 p-0"
                >
                  {isNavExpanded ? (
                    <FiChevronDown className="h-4 w-4" />
                  ) : (
                    <FiChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
              {!navItem.alwaysVisible && (
                <Checkbox
                  id={`nav-${navItem.id}`}
                  checked={hasNavPermission}
                  onCheckedChange={(checked) =>
                    handleNavigationToggle(navItem.id, checked as boolean)
                  }
                  disabled={disabled}
                />
              )}
              <Label
                htmlFor={`nav-${navItem.id}`}
                className={cn(
                  "text-sm font-medium cursor-pointer flex-1",
                  navItem.alwaysVisible && "opacity-60"
                )}
              >
                {navItem.label}
              </Label>
            </div>
            {(isNavExpanded || navItem.pages.length === 1) && (
              <>
                {isSettings ? (
                  renderSettingsPages(navItem)
                ) : (
                  <div className="mt-3 space-y-2 pl-8">
                    {navItem.pages.map((page) => {
                      const pagePerm = getPagePermission(page.permissionKey);
                      const isPageExpanded = expandedPages.has(page.permissionKey);
                      const hasPageAccess = pagePerm?.pageAccess ?? false;

                      return (
                        <div
                          key={page.permissionKey}
                          className={cn(
                            "border rounded p-3",
                            hasPageAccess ? "bg-muted/30" : ""
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => togglePage(page.permissionKey)}
                              className="h-6 w-6 p-0"
                            >
                              {isPageExpanded ? (
                                <FiChevronDown className="h-3 w-3" />
                              ) : (
                                <FiChevronRight className="h-3 w-3" />
                              )}
                            </Button>
                            <Checkbox
                              id={`page-${page.permissionKey}`}
                              checked={hasPageAccess}
                              onCheckedChange={(checked) =>
                                handlePageToggle(
                                  page.permissionKey,
                                  checked as boolean,
                                  page.operations
                                )
                              }
                              disabled={disabled}
                            />
                            <Label
                              htmlFor={`page-${page.permissionKey}`}
                              className="text-sm cursor-pointer flex-1"
                            >
                              {page.label}
                            </Label>
                          </div>
                          {isPageExpanded && (
                            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 pl-8">
                              {page.operations.map((operation) => {
                                const operationId = operation as Operation;
                                const isChecked =
                                  pagePerm?.operations.includes(operationId) ??
                                  false;
                                const operationMeta = OPERATIONS[operationId];

                                return (
                                  <div
                                    key={operationId}
                                    className="flex items-center space-x-2"
                                  >
                                    <Checkbox
                                      id={`${page.permissionKey}-${operationId}`}
                                      checked={isChecked}
                                      onCheckedChange={(checked) =>
                                        handleOperationToggle(
                                          page.permissionKey,
                                          operationId,
                                          checked as boolean
                                        )
                                      }
                                      disabled={disabled}
                                    />
                                    <Label
                                      htmlFor={`${page.permissionKey}-${operationId}`}
                                      className="text-xs cursor-pointer"
                                    >
                                      {operationMeta?.label || operationId}
                                    </Label>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
