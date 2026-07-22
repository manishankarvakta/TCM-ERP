"use client";

import React, { useState } from "react";
import { ValidationSummary, ImportModuleConfig } from "@/types/import";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FiCheckCircle, FiXCircle, FiAlertTriangle, FiInfo } from "react-icons/fi";

interface DataVerifierProps {
  summary: ValidationSummary;
  config: ImportModuleConfig;
}

export default function DataVerifier({ summary, config }: DataVerifierProps) {
  const [filterTab, setFilterTab] = useState<"all" | "valid" | "invalid">("all");

  const filteredRows = summary.rows.filter((row) => {
    if (filterTab === "valid") return row.isValid;
    if (filterTab === "invalid") return !row.isValid;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total CSV Rows</p>
              <h3 className="text-2xl font-bold mt-1">{summary.totalRows}</h3>
            </div>
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <FiInfo className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Valid Ready Rows</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {summary.validRowsCount}
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <FiCheckCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Invalid / Failed Rows</p>
              <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {summary.invalidRowsCount}
              </h3>
            </div>
            <div className="p-2.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
              <FiXCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Mapped Schema Fields</p>
              <h3 className="text-2xl font-bold mt-1">
                {summary.mappedFieldsCount} / {config.fields.length}
              </h3>
            </div>
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
              <FiAlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unmapped Required Fields Alert */}
      {summary.unmappedRequiredFields.length > 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <h4 className="font-semibold text-destructive text-sm flex items-center gap-2">
            <FiXCircle className="h-4 w-4" /> Cannot proceed with import
          </h4>
          <p className="text-xs text-destructive/90 mt-1">
            The following required fields are not mapped. Return to Step 2 (Field Mapping) to map them:
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {summary.unmappedRequiredFields.map((f) => (
              <Badge key={f.key} variant="destructive">
                {f.label} *
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Rows Verification Table */}
      <div className="space-y-4">
        <Tabs defaultValue="all" value={filterTab} onValueChange={(v: any) => setFilterTab(v)}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all">All Rows ({summary.totalRows})</TabsTrigger>
              <TabsTrigger value="valid" className="text-emerald-600">
                Valid ({summary.validRowsCount})
              </TabsTrigger>
              <TabsTrigger value="invalid" className="text-rose-600">
                Invalid ({summary.invalidRowsCount})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={filterTab} className="mt-4">
            <div className="border rounded-lg overflow-x-auto bg-background max-h-[500px]">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-16">Row #</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    {config.fields.map((f) => (
                      <TableHead key={f.key} className="whitespace-nowrap">
                        {f.label} {f.required && <span className="text-destructive">*</span>}
                      </TableHead>
                    ))}
                    <TableHead className="min-w-[200px]">Validation Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={config.fields.length + 3} className="text-center py-8 text-muted-foreground">
                        No rows matching filter criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => (
                      <TableRow key={row.rowIndex} className={row.isValid ? "hover:bg-muted/30" : "bg-rose-500/5 hover:bg-rose-500/10"}>
                        <TableCell className="font-mono text-xs">{row.rowIndex}</TableCell>
                        <TableCell>
                          {row.isValid ? (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300">
                              Valid
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Invalid</Badge>
                          )}
                        </TableCell>

                        {config.fields.map((f) => {
                          const val = row.data[f.key];
                          const hasFieldError = row.errors.some((e) => e.fieldKey === f.key);

                          return (
                            <TableCell key={f.key} className={`whitespace-nowrap text-xs ${hasFieldError ? "bg-rose-500/15 font-semibold text-rose-700 dark:text-rose-300" : ""}`}>
                              {val !== undefined && val !== "" ? (
                                String(val)
                              ) : (
                                <span className="text-muted-foreground italic">-</span>
                              )}
                            </TableCell>
                          );
                        })}

                        <TableCell className="text-xs">
                          {row.errors.length === 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Ready</span>
                          ) : (
                            <ul className="list-disc list-inside text-rose-600 dark:text-rose-400 space-y-1">
                              {row.errors.map((e, idx) => (
                                <li key={idx}>{e.message}</li>
                              ))}
                            </ul>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
