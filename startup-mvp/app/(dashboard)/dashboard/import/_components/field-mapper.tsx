"use client";

import React, { useEffect } from "react";
import { ImportModuleConfig, FieldMapping } from "@/types/import";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FiCheckCircle, FiAlertTriangle, FiZap } from "react-icons/fi";

interface FieldMapperProps {
  config: ImportModuleConfig;
  headers: string[];
  mapping: FieldMapping;
  onChangeMapping: (newMapping: FieldMapping) => void;
}

export default function FieldMapper({
  config,
  headers,
  mapping,
  onChangeMapping,
}: FieldMapperProps) {
  // Auto-match headers if not mapped yet
  const handleAutoMatch = () => {
    const newMapping: FieldMapping = { ...mapping };
    headers.forEach((header) => {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "");
      const matchedField = config.fields.find((field) => {
        const normalizedKey = field.key.toLowerCase().replace(/[^a-z0-9]/g, "");
        const normalizedLabel = field.label.toLowerCase().replace(/[^a-z0-9]/g, "");
        return (
          normalizedHeader === normalizedKey ||
          normalizedHeader === normalizedLabel ||
          normalizedHeader.includes(normalizedKey) ||
          normalizedKey.includes(normalizedHeader)
        );
      });

      if (matchedField) {
        newMapping[header] = matchedField.key;
      }
    });
    onChangeMapping(newMapping);
  };

  const handleSelectField = (csvHeader: string, targetFieldKey: string) => {
    const newMapping = { ...mapping };
    if (targetFieldKey === "__ignore__") {
      delete newMapping[csvHeader];
    } else {
      newMapping[csvHeader] = targetFieldKey;
    }
    onChangeMapping(newMapping);
  };

  const mappedTargetKeys = new Set(Object.values(mapping).filter(Boolean));
  const missingRequiredFields = config.fields.filter(
    (field) => field.required && !mappedTargetKeys.has(field.key)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 p-4 rounded-lg border">
        <div>
          <h3 className="font-semibold text-lg">Map CSV Columns to System Fields</h3>
          <p className="text-sm text-muted-foreground">
            Match each column from your CSV file to the corresponding database field in {config.label}.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleAutoMatch} className="shrink-0">
          <FiZap className="mr-2 h-4 w-4 text-amber-500" />
          Auto-Match Columns
        </Button>
      </div>

      {missingRequiredFields.length > 0 && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 flex items-start gap-3">
          <FiAlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-medium text-amber-800 dark:text-amber-300 text-sm">
              Missing Required Field Mappings ({missingRequiredFields.length})
            </h4>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              The following required fields must be mapped before proceeding:
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {missingRequiredFields.map((field) => (
                <Badge key={field.key} variant="destructive" className="text-xs">
                  {field.label} *
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden bg-background">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-1/3">CSV Column Header</TableHead>
              <TableHead className="w-1/3">Maps To Database Field</TableHead>
              <TableHead className="w-1/3">Field Type & Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {headers.map((header) => {
              const currentMappedKey = mapping[header] || "";
              const matchedFieldConfig = config.fields.find((f) => f.key === currentMappedKey);

              return (
                <TableRow key={header} className="hover:bg-muted/30">
                  <TableCell className="font-medium">
                    <span className="bg-muted px-2.5 py-1 rounded text-xs border font-mono">
                      {header}
                    </span>
                  </TableCell>

                  <TableCell>
                    <Select
                      value={currentMappedKey || "__ignore__"}
                      onValueChange={(val) => handleSelectField(header, val)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Do not import (Ignore)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__ignore__">
                          <span className="text-muted-foreground">-- Ignore column --</span>
                        </SelectItem>
                        {config.fields.map((field) => {
                          const isAlreadyMappedToOther =
                            mappedTargetKeys.has(field.key) && currentMappedKey !== field.key;
                          return (
                            <SelectItem
                              key={field.key}
                              value={field.key}
                              disabled={isAlreadyMappedToOther}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span>{field.label}</span>
                                {field.required && (
                                  <span className="text-destructive font-bold text-xs">* Required</span>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  <TableCell>
                    {matchedFieldConfig ? (
                      <div className="flex items-center gap-2">
                        <FiCheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                        <Badge variant="outline" className="capitalize text-xs">
                          {matchedFieldConfig.type}
                        </Badge>
                        {matchedFieldConfig.required && (
                          <Badge variant="secondary" className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Ignored column</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
