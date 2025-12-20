"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { MODULES, OPERATIONS } from "@/types/permissions";
import type { Module, Operation } from "@/types/permissions";

interface ModulePermissionCardProps {
  module: Module;
  operations: Operation[];
  onChange: (operations: Operation[]) => void;
  disabled?: boolean;
  showAllOperations?: boolean;
}

export default function ModulePermissionCard({
  module,
  operations,
  onChange,
  disabled = false,
  showAllOperations = false,
}: ModulePermissionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const moduleMeta = MODULES[module];
  const allOperations = showAllOperations
    ? Object.values(OPERATIONS)
    : Object.values(OPERATIONS).filter((op) => op.category === "basic");

  const handleOperationToggle = (operation: Operation, checked: boolean) => {
    if (checked) {
      if (!operations.includes(operation)) {
        onChange([...operations, operation]);
      }
    } else {
      onChange(operations.filter((op) => op !== operation));
    }
  };

  const handleSelectAll = () => {
    onChange(allOperations.map((op) => op.id as Operation));
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  const hasAllOperations = allOperations.every((op) =>
    operations.includes(op.id as Operation)
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Checkbox
              id={`module-${module}`}
              checked={operations.length > 0}
              onCheckedChange={(checked) => {
                if (checked) {
                  handleSelectAll();
                } else {
                  handleDeselectAll();
                }
              }}
              disabled={disabled}
            />
            <div className="flex-1">
              <Label
                htmlFor={`module-${module}`}
                className="text-base font-semibold cursor-pointer"
              >
                {moduleMeta.label}
              </Label>
              {moduleMeta.description && (
                <CardDescription className="mt-1">
                  {moduleMeta.description}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {operations.length > 0 && (
              <Badge variant="secondary">
                {operations.length} {operations.length === 1 ? "operation" : "operations"}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              disabled={operations.length === 0}
            >
              {isExpanded ? (
                <FiChevronUp className="h-4 w-4" />
              ) : (
                <FiChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      {operations.length > 0 && isExpanded && (
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="text-sm font-medium">Operations</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={disabled || hasAllOperations}
                  className="h-7 text-xs"
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAll}
                  disabled={disabled || operations.length === 0}
                  className="h-7 text-xs"
                >
                  Deselect All
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {allOperations.map((operation) => {
                const operationId = operation.id as Operation;
                const isChecked = operations.includes(operationId);

                return (
                  <div
                    key={operationId}
                    className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent"
                  >
                    <Checkbox
                      id={`${module}-${operationId}`}
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        handleOperationToggle(operationId, checked as boolean)
                      }
                      disabled={disabled}
                    />
                    <Label
                      htmlFor={`${module}-${operationId}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {operation.label}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

