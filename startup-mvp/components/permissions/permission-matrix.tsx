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
  StandardOperation,
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
    availableOperations: StandardOperation[]
  ) => {
    const newPermissions = { ...permissions };
    const current = getPagePermission(permissionKey);

    if (checked) {
      // Select page: enable with all operations
      newPermissions[permissionKey] = {
        navigationVisible: current?.navigationVisible ?? true,
        pageAccess: true,
        operations: [...(availableOperations as Operation[])],
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
    operation: StandardOperation,
    checked: boolean
  ) => {
    const newPermissions = { ...permissions };
    const current = getPagePermission(permissionKey);
    const currentOps = current?.operations ?? [];
    const operationAsOp = operation as Operation;

    const newOps = checked
      ? [...new Set([...currentOps, operationAsOp])]
      : currentOps.filter((op) => op !== operationAsOp);

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

  return (
    <div className="space-y-3">
      {NAVIGATION_STRUCTURE.map((navItem) => {
        const isNavExpanded = expandedNavigations.has(navItem.id);
        const hasNavPermission = hasNavigationPermission(navItem.id);

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
                            const operationId = operation as StandardOperation;
                            const operationAsOp = operationId as Operation;
                            const isChecked =
                              pagePerm?.operations.includes(operationAsOp) ??
                              false;
                            const operationMeta = OPERATIONS[operationAsOp];

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
}
