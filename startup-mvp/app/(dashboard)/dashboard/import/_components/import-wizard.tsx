"use client";

import React, { useState } from "react";
import { ImportModuleConfig, FieldMapping, ValidationSummary, DuplicateStrategy, ImportExecutionResult } from "@/types/import";
import { IMPORT_MODULES } from "@/lib/import-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  generateSampleCsvAction,
  parseAndValidateCsvAction,
  executeImportAction,
} from "../_actions/import.action";
import FieldMapper from "./field-mapper";
import DataVerifier from "./data-verifier";
import {
  FiDownload,
  FiUploadCloud,
  FiFileText,
  FiArrowRight,
  FiArrowLeft,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiDatabase,
  FiLock,
  FiCheckSquare,
  FiSquare,
} from "react-icons/fi";
import * as XLSX from "xlsx";

export default function ImportWizard() {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const initialModule = IMPORT_MODULES.find((m) => m.id === "Products") || IMPORT_MODULES[0];
  const [selectedModuleId, setSelectedModuleId] = useState<string>(initialModule.id);

  // Track user-selected fields for import (required fields auto-selected and locked)
  const [selectedFieldKeys, setSelectedFieldKeys] = useState<string[]>(() =>
    initialModule.fields.map((f) => f.key)
  );

  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawCsvContent, setRawCsvContent] = useState<string>("");
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>("skip");

  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportExecutionResult | null>(null);

  const currentModuleConfig = IMPORT_MODULES.find((m) => m.id === selectedModuleId) || IMPORT_MODULES[0];

  // Active module config with user-selected fields filtered
  const activeModuleConfig: ImportModuleConfig = {
    ...currentModuleConfig,
    fields: currentModuleConfig.fields.filter(
      (f) => f.required || selectedFieldKeys.includes(f.key)
    ),
  };

  // Handle module change
  const handleModuleChange = (newModuleId: string) => {
    setSelectedModuleId(newModuleId);
    const mod = IMPORT_MODULES.find((m) => m.id === newModuleId) || IMPORT_MODULES[0];
    setSelectedFieldKeys(mod.fields.map((f) => f.key));
    setFile(null);
    setCsvHeaders([]);
    setRawCsvContent("");
    setFieldMapping({});
    setValidationSummary(null);
  };

  // Toggle optional field selection
  const handleToggleField = (fieldKey: string) => {
    const field = currentModuleConfig.fields.find((f) => f.key === fieldKey);
    if (field?.required) return; // Cannot toggle required fields

    if (selectedFieldKeys.includes(fieldKey)) {
      setSelectedFieldKeys(selectedFieldKeys.filter((k) => k !== fieldKey));
    } else {
      setSelectedFieldKeys([...selectedFieldKeys, fieldKey]);
    }
  };

  // Select all fields
  const handleSelectAllFields = () => {
    setSelectedFieldKeys(currentModuleConfig.fields.map((f) => f.key));
  };

  // Select only required fields
  const handleSelectOnlyRequiredFields = () => {
    setSelectedFieldKeys(
      currentModuleConfig.fields.filter((f) => f.required).map((f) => f.key)
    );
  };

  // Download Sample CSV (customized to selected fields)
  const handleDownloadSample = async () => {
    try {
      setLoading(true);
      const res = await generateSampleCsvAction(selectedModuleId, selectedFieldKeys);
      if (res.success && res.csvContent) {
        const blob = new Blob([res.csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", res.filename || `sample_${selectedModuleId.toLowerCase()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Success", description: "Customized sample CSV downloaded" });
      } else {
        toast({ title: "Error", description: res.error || "Failed to download sample CSV", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to download sample", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Handle File Upload & Parse Headers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        setRawCsvContent(content);

        // Read headers using XLSX
        const workbook = XLSX.read(content, { type: "string" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) return;

        const sheet = workbook.Sheets[sheetName];
        const jsonRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (jsonRows.length > 0 && Array.isArray(jsonRows[0])) {
          const headers = jsonRows[0].map((h) => String(h).trim()).filter(Boolean);
          setCsvHeaders(headers);

          // Initial auto-mapping: System Database Field (targetKey) -> CSV Column Header (csvHeader)
          const initialMapping: FieldMapping = {};
          const usedHeaders = new Set<string>();

          // Pass 1: Exact Matches (Key or Label)
          activeModuleConfig.fields.forEach((field) => {
            const normalizedKey = field.key.toLowerCase().replace(/[^a-z0-9]/g, "");
            const normalizedLabel = field.label.toLowerCase().replace(/[^a-z0-9]/g, "");

            const exactHeader = headers.find((h) => {
              const normalizedHeader = h.toLowerCase().replace(/[^a-z0-9]/g, "");
              return normalizedHeader === normalizedKey || normalizedHeader === normalizedLabel;
            });

            if (exactHeader) {
              initialMapping[field.key] = exactHeader;
              usedHeaders.add(exactHeader);
            }
          });

          // Pass 2: Partial Matches for unmapped fields (avoiding used headers)
          activeModuleConfig.fields.forEach((field) => {
            if (initialMapping[field.key]) return;

            const normalizedKey = field.key.toLowerCase().replace(/[^a-z0-9]/g, "");
            const normalizedLabel = field.label.toLowerCase().replace(/[^a-z0-9]/g, "");

            const partialHeader = headers.find((h) => {
              if (usedHeaders.has(h)) return false;
              const normalizedHeader = h.toLowerCase().replace(/[^a-z0-9]/g, "");
              return normalizedHeader.includes(normalizedKey) || normalizedHeader.includes(normalizedLabel);
            });

            if (partialHeader) {
              initialMapping[field.key] = partialHeader;
              usedHeaders.add(partialHeader);
            }
          });

          setFieldMapping(initialMapping);
        }
      } catch (err) {
        toast({ title: "File Error", description: "Failed to read uploaded CSV file", variant: "destructive" });
      }
    };

    reader.readAsText(uploadedFile);
  };

  // Step 1 -> Step 2
  const handleGoToMapping = () => {
    if (!file || csvHeaders.length === 0) {
      toast({ title: "No File", description: "Please upload a valid CSV file first", variant: "destructive" });
      return;
    }
    setStep(2);
  };

  // Step 2 -> Step 3 (Validate)
  const handleGoToVerification = async () => {
    try {
      setLoading(true);
      const res = await parseAndValidateCsvAction(
        selectedModuleId,
        rawCsvContent,
        fieldMapping,
        selectedFieldKeys
      );

      if (res.success && res.summary) {
        setValidationSummary(res.summary);
        setStep(3);
      } else {
        toast({ title: "Validation Error", description: res.error || "Failed to validate CSV data", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Validation failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Step 3 -> Step 4 (Execute Import)
  const handleExecuteImport = async () => {
    if (!validationSummary) return;

    const validRowsToImport = validationSummary.rows
      .filter((r) => r.isValid)
      .map((r) => r.data);

    if (validRowsToImport.length === 0) {
      toast({
        title: "No Valid Rows",
        description: "There are no valid records available to import.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const res = await executeImportAction(selectedModuleId, validRowsToImport, duplicateStrategy);

      setImportResult(res);
      setStep(4);
      if (res.success) {
        toast({
          title: "Import Completed",
          description: `Successfully imported ${res.createdCount} new and updated ${res.updatedCount} records.`,
        });
      } else {
        toast({
          title: "Import Finished with Errors",
          description: res.error || "Some rows failed to import.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({ title: "Import Failed", description: "Batch execution error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setCsvHeaders([]);
    setRawCsvContent("");
    setFieldMapping({});
    setValidationSummary(null);
    setImportResult(null);
  };

  // Download CSV of skipped or failed rows with "reason for skip or fail" column
  const handleDownloadUnprocessedCsv = () => {
    const unprocessedRows: Record<string, any>[] = [];

    // 1. Add rows skipped during import execution
    if (importResult?.skippedRows && importResult.skippedRows.length > 0) {
      importResult.skippedRows.forEach((sr) => {
        const matchingValidationRow = validationSummary?.rows.find((r) => r.rowIndex === sr.rowIndex);
        const rowData = matchingValidationRow?.rawData || sr.data;
        unprocessedRows.push({
          ...rowData,
          "reason for skip or fail": sr.reason || "Skipped: Duplicate record exists in database",
        });
      });
    }

    // 2. Add rows failed during import execution
    if (importResult?.failedRows && importResult.failedRows.length > 0) {
      importResult.failedRows.forEach((fr) => {
        const matchingValidationRow = validationSummary?.rows.find((r) => r.rowIndex === fr.rowIndex);
        const rowData = matchingValidationRow?.rawData || fr.data;
        unprocessedRows.push({
          ...rowData,
          "reason for skip or fail": `Failed: ${fr.error}`,
        });
      });
    }

    // 3. Add rows invalid during validation
    if (validationSummary) {
      validationSummary.rows
        .filter((r) => !r.isValid)
        .forEach((r) => {
          const reasonMsg = r.errors.map((e) => e.message).join(" | ");
          const alreadyAdded = unprocessedRows.some(
            (u) => JSON.stringify(u) === JSON.stringify({ ...r.rawData, "reason for skip or fail": `Validation Error: ${reasonMsg}` })
          );
          if (!alreadyAdded) {
            unprocessedRows.push({
              ...r.rawData,
              "reason for skip or fail": `Validation Error: ${reasonMsg}`,
            });
          }
        });
    }

    if (unprocessedRows.length === 0) {
      toast({ title: "No Skipped or Failed Records", description: "All rows were successfully imported." });
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(unprocessedRows);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `skipped_and_failed_${selectedModuleId.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Downloaded CSV",
      description: `Exported ${unprocessedRows.length} record(s) with 'reason for skip or fail' column for reconciliation.`,
    });
  };

  const unmappedRequiredCount = activeModuleConfig.fields.filter(
    (f) => f.required && (!fieldMapping[f.key] || fieldMapping[f.key].trim() === "")
  ).length;

  const requiredFields = currentModuleConfig.fields.filter((f) => f.required);
  const optionalFields = currentModuleConfig.fields.filter((f) => !f.required);

  return (
    <div className="space-y-6">
      {/* Step Indicator Header */}
      <div className="grid grid-cols-4 gap-2 border-b pb-4 text-center">
        <div className={`p-2 rounded-md ${step === 1 ? "bg-primary text-primary-foreground font-semibold" : step > 1 ? "bg-muted text-foreground" : "text-muted-foreground"}`}>
          1. Select & Upload
        </div>
        <div className={`p-2 rounded-md ${step === 2 ? "bg-primary text-primary-foreground font-semibold" : step > 2 ? "bg-muted text-foreground" : "text-muted-foreground"}`}>
          2. Field Mapping
        </div>
        <div className={`p-2 rounded-md ${step === 3 ? "bg-primary text-primary-foreground font-semibold" : step > 3 ? "bg-muted text-foreground" : "text-muted-foreground"}`}>
          3. Verification
        </div>
        <div className={`p-2 rounded-md ${step === 4 ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground"}`}>
          4. Summary Report
        </div>
      </div>

      {/* STEP 1: MODULE SELECT & FILE UPLOAD */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Select Target Module & Upload CSV</CardTitle>
              <CardDescription>
                Choose which data entity you want to import from your CSV file.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Module Dropdown */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Import Module (`importItems`)</label>
                <Select value={selectedModuleId} onValueChange={handleModuleChange}>
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="Select Module..." />
                  </SelectTrigger>
                  <SelectContent>
                    {IMPORT_MODULES.map((mod) => (
                      <SelectItem key={mod.id} value={mod.id}>
                        <div className="flex items-center justify-between w-full">
                          <span className="font-semibold">{mod.label}</span>
                          <span className="text-xs text-muted-foreground ml-4">
                            ({mod.targetModel} Model)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sample CSV Download CTA */}
              <div className="p-4 rounded-lg bg-muted/40 border flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <FiFileText className="h-4 w-4 text-primary" /> Need a formatted CSV template?
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Download a CSV template pre-structured for your selected fields.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownloadSample} disabled={loading}>
                  <FiDownload className="mr-2 h-4 w-4" /> Download Sample CSV
                </Button>
              </div>

              {/* CSV Upload Dropzone */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Upload CSV File</label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/20 transition-colors flex flex-col items-center justify-center gap-3">
                  <FiUploadCloud className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {file ? file.name : "Click to choose a CSV file from your computer"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Supports standard .csv format</p>
                  </div>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="cursor-pointer max-w-xs"
                  />
                </div>
              </div>

              {file && (
                <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-md">
                  <div className="flex items-center gap-2">
                    <FiCheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-900 dark:text-emerald-300">
                      File loaded ({csvHeaders.length} columns detected)
                    </span>
                  </div>
                  <Button onClick={handleGoToMapping} size="sm">
                    Next: Map Fields <FiArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Interactive Field Selection Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{currentModuleConfig.label} Fields Selection</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {selectedFieldKeys.length} / {currentModuleConfig.fields.length} Selected
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Select which data fields you want to import. Required fields are automatically selected.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {/* Field Select All / Quick Toggle Actions */}
              <div className="flex items-center justify-between border-b pb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleSelectAllFields}
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={handleSelectOnlyRequiredFields}
                >
                  Only Required
                </Button>
              </div>

              {/* Required Fields Section (Locked) */}
              {requiredFields.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-semibold text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1.5">
                    <FiLock className="h-3 w-3" /> Required Fields ({requiredFields.length}):
                  </h5>
                  <div className="space-y-1.5 pl-1">
                    {requiredFields.map((f) => (
                      <div key={f.key} className="flex items-center gap-2 bg-rose-500/10 p-2 rounded-md border border-rose-500/20">
                        <Checkbox checked={true} disabled={true} />
                        <span className="font-medium text-xs text-rose-900 dark:text-rose-200">
                          {f.label} <span className="text-rose-600 font-bold">*</span>
                        </span>
                        <Badge variant="destructive" className="ml-auto text-[10px] py-0">Required</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Optional Fields Section (Interactive Checkboxes) */}
              {optionalFields.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h5 className="font-semibold text-muted-foreground text-xs">
                    Optional Fields ({optionalFields.length}):
                  </h5>
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                    {optionalFields.map((f) => {
                      const isChecked = selectedFieldKeys.includes(f.key);

                      return (
                        <label
                          key={f.key}
                          className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                            isChecked ? "bg-accent/40 border-primary/40 font-medium" : "hover:bg-muted/40 border-border opacity-70"
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleToggleField(f.key)}
                          />
                          <span className="text-xs">{f.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 2: FIELD MAPPING */}
      {step === 2 && (
        <div className="space-y-6">
          <FieldMapper
            config={activeModuleConfig}
            headers={csvHeaders}
            mapping={fieldMapping}
            onChangeMapping={setFieldMapping}
          />

          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => setStep(1)}>
              <FiArrowLeft className="mr-2 h-4 w-4" /> Back to Upload
            </Button>

            <Button
              onClick={handleGoToVerification}
              disabled={loading || unmappedRequiredCount > 0}
            >
              {loading ? "Validating Data..." : "Next: Verify Data"} <FiArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: VERIFICATION & PREVIEW */}
      {step === 3 && validationSummary && (
        <div className="space-y-6">
          <DataVerifier summary={validationSummary} config={activeModuleConfig} />

          {/* Duplicate Strategy Option */}
          <Card className="bg-card">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold">Duplicate Record Handling Strategy</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Action to take if a record already exists in database (matching unique code or email).
                </p>
              </div>

              <Select value={duplicateStrategy} onValueChange={(v: any) => setDuplicateStrategy(v)}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select strategy..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Skip duplicates (Keep existing)</SelectItem>
                  <SelectItem value="update">Update existing records</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => setStep(2)}>
              <FiArrowLeft className="mr-2 h-4 w-4" /> Back to Mapping
            </Button>

            <Button
              onClick={handleExecuteImport}
              disabled={
                loading ||
                validationSummary.unmappedRequiredFields.length > 0 ||
                validationSummary.validRowsCount === 0
              }
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? (
                <>
                  <FiRefreshCw className="mr-2 h-4 w-4 animate-spin" /> Importing Records...
                </>
              ) : (
                <>
                  <FiDatabase className="mr-2 h-4 w-4" /> Execute Import ({validationSummary.validRowsCount} Rows)
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: SUMMARY REPORT */}
      {step === 4 && importResult && (
        <div className="space-y-6 max-w-3xl mx-auto">
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-2">
                <FiCheckCircle className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Import Execution Complete</CardTitle>
              <CardDescription>
                Summary report for {currentModuleConfig.label} import process.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-background border rounded-lg">
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{importResult.createdCount}</p>
                </div>

                <div className="p-3 bg-background border rounded-lg">
                  <p className="text-xs text-muted-foreground">Updated</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{importResult.updatedCount}</p>
                </div>

                <div className="p-3 bg-background border rounded-lg">
                  <p className="text-xs text-muted-foreground">Skipped</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">{importResult.skippedCount}</p>
                </div>

                <div className="p-3 bg-background border rounded-lg">
                  <p className="text-xs text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold text-rose-600 mt-1">{importResult.failedCount}</p>
                </div>
              </div>

              {/* Download CSV CTA for Skipped or Failed Records */}
              {(importResult.skippedCount > 0 || importResult.failedCount > 0 || (validationSummary && validationSummary.invalidRowsCount > 0)) && (
                <div className="p-4 border border-amber-300 dark:border-amber-800 bg-amber-500/10 rounded-lg space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                        <FiAlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        Reconciliation CSV Download Available
                      </h4>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                        Download a CSV with all skipped and failed records including a <strong>"reason for skip or fail"</strong> column to review and re-import.
                      </p>
                    </div>
                    <Button
                      onClick={handleDownloadUnprocessedCsv}
                      className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 text-xs font-medium"
                      size="sm"
                    >
                      <FiDownload className="mr-2 h-4 w-4" /> Download Skipped / Failed CSV
                    </Button>
                  </div>
                </div>
              )}

              {/* Skipped Records Breakdown List */}
              {importResult.skippedRows && importResult.skippedRows.length > 0 && (
                <div className="border border-amber-200 dark:border-amber-900 rounded-lg p-4 bg-background">
                  <h4 className="font-semibold text-amber-700 dark:text-amber-400 text-sm mb-2">Skipped Records Details:</h4>
                  <ul className="list-disc list-inside text-xs text-amber-800 dark:text-amber-300 space-y-1 max-h-40 overflow-y-auto">
                    {importResult.skippedRows.map((sr, idx) => (
                      <li key={idx}>
                        Row {sr.rowIndex}: {sr.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Failed Ingestion Details List */}
              {importResult.failedRows && importResult.failedRows.length > 0 && (
                <div className="border border-rose-200 dark:border-rose-900 rounded-lg p-4 bg-background">
                  <h4 className="font-semibold text-rose-600 text-sm mb-2">Failed Ingestion Details:</h4>
                  <ul className="list-disc list-inside text-xs text-rose-700 dark:text-rose-400 space-y-1 max-h-40 overflow-y-auto">
                    {importResult.failedRows.map((fr, idx) => (
                      <li key={idx}>
                        Row {fr.rowIndex}: {fr.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-center pt-4 border-t">
                <Button onClick={handleReset}>
                  <FiRefreshCw className="mr-2 h-4 w-4" /> Import Another File
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
