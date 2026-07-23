"use client";

import React from "react";
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
  mapping: FieldMapping; // Map of targetFieldKey -> csvHeader
  onChangeMapping: (newMapping: FieldMapping) => void;
}

export default function FieldMapper({
  config,
  headers,
  mapping,
  onChangeMapping,
}: FieldMapperProps) {
  // Auto-match system fields to CSV headers
  const handleAutoMatch = () => {
    const newMapping: FieldMapping = { ...mapping };

    config.fields.forEach((field) => {
      const normalizedKey = field.key.toLowerCase().replace(/[^a-z0-9]/g, "");
      const normalizedLabel = field.label.toLowerCase().replace(/[^a-z0-9]/g, "");

      const matchedHeader = headers.find((header) => {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "");
        return (
          normalizedHeader === normalizedKey ||
          normalizedHeader === normalizedLabel ||
          normalizedHeader.includes(normalizedKey) ||
          normalizedLabel.includes(normalizedHeader)
        );
      });

      if (matchedHeader) {
        newMapping[field.key] = matchedHeader;
      }
    });

    onChangeMapping(newMapping);
  };

  const handleSelectHeader = (fieldKey: string, csvHeader: string) => {
    const newMapping = { ...mapping };
    if (csvHeader === "__unmapped__") {
      delete newMapping[fieldKey];
    } else {
      newMapping[fieldKey] = csvHeader;
    }
    onChangeMapping(newMapping);
  };

  // Find required fields that are not assigned to any CSV header
  const unmappedRequiredFields = config.fields.filter(
    (field) => field.required && (!mapping[field.key] || mapping[field.key].trim() === "")
  );

  // Set of CSV headers already mapped to system fields
  const mappedCsvHeaders = new Set(Object.values(mapping).filter(Boolean));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 p-4 rounded-lg border">
        <div>
          <h3 className="font-semibold text-lg">Map System Fields to CSV Columns</h3>
          <p className="text-sm text-muted-foreground">
            Select which column from your CSV file maps to each required and selected database field in {config.label}.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleAutoMatch} className="shrink-0">
          <FiZap className="mr-2 h-4 w-4 text-amber-500" />
          Auto-Match Fields
        </Button>
      </div>

      {unmappedRequiredFields.length > 0 && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 flex items-start gap-3">
          <FiAlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-medium text-amber-800 dark:text-amber-300 text-sm">
              Missing Required System Fields ({unmappedRequiredFields.length})
            </h4>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              The following required fields must be assigned to a CSV column before proceeding:
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {unmappedRequiredFields.map((field) => (
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
              <TableHead className="w-1/3">System Database Field (Target)</TableHead>
              <TableHead className="w-1/3">CSV Column Header (Source)</TableHead>
              <TableHead className="w-1/3">Status & Type Info</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {config.fields.map((field) => {
              const currentCsvHeader = mapping[field.key] || "";

              return (
                <TableRow key={field.key} className="hover:bg-muted/30">
                  {/* Left Column: System Database Field */}
                  <TableCell className="font-medium">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{field.label}</span>
                        {field.required && (
                          <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-bold">
                            * Required
                          </Badge>
                        )}
                      </div>
                      {field.description && (
                        <p className="text-xs text-muted-foreground">{field.description}</p>
                      )}
                    </div>
                  </TableCell>

                  {/* Middle Column: CSV Header Dropdown */}
                  <TableCell>
                    <Select
                      value={currentCsvHeader || "__unmapped__"}
                      onValueChange={(val) => handleSelectHeader(field.key, val)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="-- Select CSV Column --" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unmapped__">
                          <span className="text-muted-foreground italic">-- Not in CSV (Leave Empty) --</span>
                        </SelectItem>
                        {headers.map((header) => {
                          const isAlreadyMappedToOther =
                            mappedCsvHeaders.has(header) && currentCsvHeader !== header;

                          return (
                            <SelectItem
                              key={header}
                              value={header}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-xs">{header}</span>
                                {isAlreadyMappedToOther && (
                                  <span className="text-[10px] text-muted-foreground">(mapped)</span>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Right Column: Status & Type */}
                  <TableCell>
                    {currentCsvHeader ? (
                      <div className="flex items-center gap-2">
                        <FiCheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className="text-xs font-mono bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          {currentCsvHeader}
                        </span>
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {field.type}
                        </Badge>
                      </div>
                    ) : field.required ? (
                      <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-xs font-medium">
                        <FiAlertTriangle className="h-3.5 w-3.5" /> Required mapping missing
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Not mapped (Optional)</span>
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
