"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UploadCloud, CheckCircle2, FileWarning, Download, FileSpreadsheet, Cpu, AlertTriangle, ArrowLeft, X, FileText } from "lucide-react";
import Link from "next/link";
import { importDirectAttendanceAction, DirectAttendanceImportRow } from "../../_actions/import.action";

type Device = { id: string; name: string; serialNumber: string | null };

type DirectParsedRow = DirectAttendanceImportRow & {
  _valid: boolean;
  _error?: string;
};

type BiometricParsedRow = {
  PIN: string;
  Time: string;
  DeviceID: string;
  Status: string;
  Verified: string;
  WorkCode: string;
  _valid: boolean;
  _error?: string;
};

interface FileUploadDropzoneProps {
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  disabled?: boolean;
  title?: string;
  acceptHint?: string;
}

function FileUploadDropzone({
  file,
  onFileSelect,
  onFileRemove,
  disabled = false,
  title = "Click to upload or drag & drop",
  acceptHint = "CSV files (.csv) up to 10MB",
}: FileUploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const droppedFile = files[0];
      if (droppedFile.name.endsWith(".csv") || droppedFile.name.endsWith(".txt")) {
        onFileSelect(droppedFile);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept=".csv, .txt"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) onFileSelect(selected);
        }}
      />

      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`relative group cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
            isDragging
              ? "border-primary bg-primary/5 shadow-md scale-[1.005]"
              : "border-muted-foreground/25 hover:border-primary/50 bg-slate-50/50 hover:bg-slate-100/60"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3.5 rounded-full bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 group-hover:scale-110 transition-all duration-200 shadow-sm border border-emerald-100">
              <UploadCloud className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {title}
              </p>
              <p className="text-xs text-muted-foreground">{acceptHint}</p>
            </div>
            <Badge variant="outline" className="text-[11px] font-medium bg-background text-muted-foreground border-slate-200">
              Browse Files
            </Badge>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 line-clamp-1">{file.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Ready to parse
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-8 bg-background hover:bg-slate-100"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
            >
              Change File
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={onFileRemove}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AttendanceImportClient({ devices }: { devices: Device[] }) {
  const [activeTab, setActiveTab] = useState<"direct" | "biometric">("direct");

  // Mode 1: Direct Attendance state
  const [directFile, setDirectFile] = useState<File | null>(null);
  const [directRows, setDirectRows] = useState<DirectParsedRow[]>([]);
  const [isProcessingDirect, setIsProcessingDirect] = useState(false);
  const [directSummary, setDirectSummary] = useState<any>(null);

  // Mode 2: Biometric Log state
  const [bioFile, setBioFile] = useState<File | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [bioRows, setBioRows] = useState<BiometricParsedRow[]>([]);
  const [isProcessingBio, setIsProcessingBio] = useState(false);
  const [bioSummary, setBioSummary] = useState<any>(null);

  // Global alert modal
  const [alertDialog, setAlertDialog] = useState<{ open: boolean; title: string; description: string }>({
    open: false,
    title: "",
    description: "",
  });

  // Download Sample Direct Attendance Template
  const handleDownloadDirectTemplate = () => {
    const csvContent =
      "EmployeeCode,Date,CheckIn,CheckOut,Status,Notes\n" +
      "EMP001,2026-09-07,09:00,17:00,,Regular Shift\n" +
      "EMP002,2026-09-07,09:25,17:00,,Auto status will detect late\n" +
      "EMP003,2026-09-07,,,ABSENT,Leave without pay\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "attendance_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download Sample Biometric ATTLOG Template
  const handleDownloadBiometricTemplate = () => {
    const csvContent =
      "PIN,Time,DeviceID,Status,Verified,WorkCode\n" +
      "101,2026-09-07 09:00:00,1,0,1,0\n" +
      "101,2026-09-07 17:05:00,1,1,1,0\n" +
      "102,2026-09-07 08:55:00,1,0,1,0\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "biometric_attlog_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse Direct Attendance CSV
  const handleDirectFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setDirectFile(uploadedFile);
    setDirectSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

      const parsed: DirectParsedRow[] = [];
      let startIndex = 0;

      // Check header
      if (lines[0].toLowerCase().includes("employeecode") || lines[0].toLowerCase().includes("date")) {
        startIndex = 1;
      }

      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(",");
        if (parts.length >= 2) {
          const employeeCode = parts[0]?.trim();
          const date = parts[1]?.trim();
          const checkIn = parts[2]?.trim() || null;
          const checkOut = parts[3]?.trim() || null;
          const status = parts[4]?.trim() || null;
          const notes = parts[5]?.trim() || null;

          let _valid = true;
          let _error = "";

          const isValidDate = (dStr: string) => {
            if (!dStr) return false;
            const str = dStr.trim().split("T")[0].split(" ")[0];
            if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str)) return true;
            if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(str)) return true;
            return !isNaN(Date.parse(str));
          };

          if (!employeeCode) {
            _valid = false;
            _error = "Missing Employee Code";
          } else if (!date) {
            _valid = false;
            _error = "Missing Date";
          } else if (!isValidDate(date)) {
            _valid = false;
            _error = "Invalid Date format (Use YYYY-MM-DD)";
          }

          parsed.push({
            employeeCode,
            date,
            checkIn,
            checkOut,
            status,
            notes,
            _valid,
            _error,
          });
        }
      }
      setDirectRows(parsed);
    };
    reader.readAsText(uploadedFile);
  };

  // Parse Biometric ATTLOG CSV
  const handleBioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setBioFile(uploadedFile);
    setBioSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

      const parsed: BiometricParsedRow[] = [];
      let startIndex = 0;

      if (lines[0].toLowerCase().includes("pin") && lines[0].toLowerCase().includes("time")) {
        startIndex = 1;
      }

      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(",");
        if (parts.length >= 2) {
          const PIN = parts[0]?.trim();
          const Time = parts[1]?.trim();
          const DeviceID = parts[2]?.trim() || "1";
          const Status = parts[3]?.trim() || "0";
          const Verified = parts[4]?.trim() || "1";
          const WorkCode = parts[5]?.trim() || "0";

          let _valid = true;
          let _error = "";

          if (!PIN) {
            _valid = false;
            _error = "Missing PIN";
          } else if (!Time) {
            _valid = false;
            _error = "Missing Time";
          } else if (isNaN(Date.parse(Time))) {
            _valid = false;
            _error = "Invalid Time format";
          }

          parsed.push({ PIN, Time, DeviceID, Status, Verified, WorkCode, _valid, _error });
        }
      }
      setBioRows(parsed);
    };
    reader.readAsText(uploadedFile);
  };

  // Submit Direct Attendance Import
  const handleImportDirect = async () => {
    const validRows = directRows.filter((r) => r._valid);
    if (validRows.length === 0) {
      setAlertDialog({ open: true, title: "No Valid Rows", description: "Please upload a CSV file with valid attendance rows." });
      return;
    }

    setIsProcessingDirect(true);
    setDirectSummary(null);

    try {
      const payload: DirectAttendanceImportRow[] = validRows.map((r) => ({
        employeeCode: r.employeeCode,
        date: r.date,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        status: r.status,
        notes: r.notes,
      }));

      const res = await importDirectAttendanceAction(payload);
      if (!res.success) throw new Error(res.error || "Import failed");

      setDirectSummary(res.summary);
      setDirectRows([]);
      setDirectFile(null);
    } catch (err: any) {
      setAlertDialog({ open: true, title: "Import Failed", description: err.message || "An unexpected error occurred." });
    } finally {
      setIsProcessingDirect(false);
    }
  };

  // Submit Biometric Log Import
  const handleImportBiometric = async () => {
    if (!selectedDevice) {
      setAlertDialog({ open: true, title: "Select Device", description: "Please select a target biometric device." });
      return;
    }

    const validRows = bioRows.filter((r) => r._valid);
    if (validRows.length === 0) {
      setAlertDialog({ open: true, title: "No Valid Rows", description: "Please upload a CSV file with valid biometric rows." });
      return;
    }

    setIsProcessingBio(true);
    setBioSummary(null);

    try {
      const response = await fetch("/api/hr/biometric/csv-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: selectedDevice, rows: validRows }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to import biometric logs");

      setBioSummary({
        totalRows: bioRows.length,
        invalidRows: bioRows.length - validRows.length,
        ...data.summary,
      });
      setBioRows([]);
      setBioFile(null);
    } catch (err: any) {
      setAlertDialog({ open: true, title: "Import Failed", description: err.message || "An error occurred during biometric import." });
    } finally {
      setIsProcessingBio(false);
    }
  };

  const directValidCount = directRows.filter((r) => r._valid).length;
  const directInvalidCount = directRows.length - directValidCount;

  const bioValidCount = bioRows.filter((r) => r._valid).length;
  const bioInvalidCount = bioRows.length - bioValidCount;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full space-y-6">
        {/* Top Header Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/hr/attendance">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Import Attendance</h1>
              <p className="text-sm text-muted-foreground">
                Upload daily attendance records or raw biometric device logs via CSV.
              </p>
            </div>
          </div>

          <TabsList className="grid grid-cols-2 w-full sm:w-auto">
            <TabsTrigger value="direct" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Direct Attendance (HR CSV)
            </TabsTrigger>
            <TabsTrigger value="biometric" className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Biometric Hardware Log
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: DIRECT HR ATTENDANCE IMPORT */}
        <TabsContent value="direct" className="space-y-6 pt-4">
          {directSummary && (
            <Alert className="bg-emerald-50 border-emerald-200">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <AlertTitle className="text-emerald-800 font-semibold">Import Complete</AlertTitle>
              <AlertDescription className="text-emerald-700 mt-2 text-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-1">
                  <div>Total Rows: <span className="font-bold">{directSummary.totalRows}</span></div>
                  <div>Created: <span className="font-bold text-emerald-800">{directSummary.createdCount}</span></div>
                  <div>Updated: <span className="font-bold text-blue-700">{directSummary.updatedCount}</span></div>
                  <div>Skipped (Locked): <span className="font-bold text-amber-700">{directSummary.skippedLocked}</span></div>
                </div>
                {directSummary.errors && directSummary.errors.length > 0 && (
                  <div className="mt-3 border-t border-emerald-200 pt-2">
                    <p className="font-medium text-amber-800 text-xs">Warnings / Errors Log:</p>
                    <ul className="list-disc pl-5 text-xs space-y-1 text-amber-900 mt-1 max-h-32 overflow-y-auto">
                      {directSummary.errors.map((err: string, idx: number) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-lg font-medium">Direct Daily Attendance CSV Upload</h2>
                <p className="text-xs text-muted-foreground">
                  Upload daily attendance records with Employee Code, Date, Check-In, and Check-Out.
                  <span className="font-semibold text-emerald-700 ml-1">
                    Status will automatically generate based on assigned shift policies if left empty!
                  </span>
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadDirectTemplate} className="flex gap-2 text-xs">
                <Download className="h-3.5 w-3.5" /> Download Sample CSV Template
              </Button>
            </div>

            <FileUploadDropzone
              file={directFile}
              onFileSelect={(selectedFile) => {
                const dummyEvent = { target: { files: [selectedFile] } } as any;
                handleDirectFileUpload(dummyEvent);
              }}
              onFileRemove={() => {
                setDirectFile(null);
                setDirectRows([]);
                setDirectSummary(null);
              }}
              disabled={isProcessingDirect}
              title="Click to upload or drag & drop attendance CSV"
              acceptHint="CSV spreadsheet containing EmployeeCode, Date, CheckIn, CheckOut"
            />

            {directRows.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">Preview ({directRows.length} Rows Parsed)</h3>
                  <div className="flex gap-2">
                    <Badge variant="outline">{directRows.length} Total</Badge>
                    <Badge variant="default" className="bg-emerald-600">{directValidCount} Valid</Badge>
                    {directInvalidCount > 0 && <Badge variant="destructive">{directInvalidCount} Invalid</Badge>}
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto border rounded-md bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee Code</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Check-In</TableHead>
                        <TableHead>Check-Out</TableHead>
                        <TableHead>Status Engine</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Validation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {directRows.slice(0, 50).map((row, i) => (
                        <TableRow key={i} className={!row._valid ? "bg-red-50/50" : ""}>
                          <TableCell className="font-mono text-xs font-semibold">{row.employeeCode}</TableCell>
                          <TableCell className="text-xs">{row.date}</TableCell>
                          <TableCell className="text-xs">{row.checkIn || "-"}</TableCell>
                          <TableCell className="text-xs">{row.checkOut || "-"}</TableCell>
                          <TableCell className="text-xs">
                            {row.status ? (
                              <Badge variant="outline">{row.status}</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                                Auto-Calculated
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{row.notes || "-"}</TableCell>
                          <TableCell>
                            {row._valid ? (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-200">OK</Badge>
                            ) : (
                              <span className="flex items-center text-xs text-red-600 gap-1 font-medium">
                                <FileWarning className="w-3.5 h-3.5" /> {row._error}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {directRows.length > 50 && (
                  <p className="text-xs text-muted-foreground text-center">Showing first 50 rows</p>
                )}

                <div className="flex justify-end pt-2">
                  <Button onClick={handleImportDirect} disabled={directValidCount === 0 || isProcessingDirect}>
                    {isProcessingDirect ? "Processing Import..." : `Import ${directValidCount} Attendance Rows`}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 2: BIOMETRIC HARDWARE LOG IMPORT */}
        <TabsContent value="biometric" className="space-y-6 pt-4">
          {bioSummary && (
            <Alert className="bg-emerald-50 border-emerald-200">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <AlertTitle className="text-emerald-800 font-semibold">Biometric Log Import Complete</AlertTitle>
              <AlertDescription className="text-emerald-700 mt-2 text-sm">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Total Rows Parsed: {bioSummary.totalRows}</li>
                  <li>Duplicate Rows Skipped: {bioSummary.duplicatesSkipped}</li>
                  <li>Successfully Queued for Sync: <span className="font-bold">{bioSummary.importedCount}</span></li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-lg font-medium">ZKTeco / ADMS Raw ATTLOG Import</h2>
                <p className="text-xs text-muted-foreground">
                  Upload raw ATTLOG files from biometric hardware. Format requires: PIN, Time, DeviceID, Status.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadBiometricTemplate} className="flex gap-2 text-xs">
                <Download className="h-3.5 w-3.5" /> Download ATTLOG Template
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">1. Select Target Device</label>
                <SearchableSelect
                  value={selectedDevice}
                  onValueChange={(val) => setSelectedDevice(val || "")}
                  placeholder="Select a biometric device..."
                  options={devices.map((d) => ({
                    value: d.id,
                    label: d.name,
                    description: d.serialNumber || undefined,
                  }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">2. Select ATTLOG CSV File</label>
                <FileUploadDropzone
                  file={bioFile}
                  onFileSelect={(selectedFile) => {
                    const dummyEvent = { target: { files: [selectedFile] } } as any;
                    handleBioFileUpload(dummyEvent);
                  }}
                  onFileRemove={() => {
                    setBioFile(null);
                    setBioRows([]);
                    setBioSummary(null);
                  }}
                  disabled={isProcessingBio}
                  title="Click to upload or drag & drop ATTLOG file"
                  acceptHint="Biometric hardware log export (.csv or .txt)"
                />
              </div>
            </div>

            {bioRows.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">Preview ({bioRows.length} Hardware Logs)</h3>
                  <div className="flex gap-2">
                    <Badge variant="outline">{bioRows.length} Total</Badge>
                    <Badge variant="default" className="bg-emerald-600">{bioValidCount} Valid</Badge>
                    {bioInvalidCount > 0 && <Badge variant="destructive">{bioInvalidCount} Invalid</Badge>}
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto border rounded-md bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PIN (User ID)</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Punch Type</TableHead>
                        <TableHead>Validation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bioRows.slice(0, 50).map((row, i) => (
                        <TableRow key={i} className={!row._valid ? "bg-red-50/50" : ""}>
                          <TableCell className="font-mono text-xs">{row.PIN}</TableCell>
                          <TableCell className="text-xs">{row.Time}</TableCell>
                          <TableCell className="text-xs">{row.Status === "0" ? "Check In" : row.Status === "1" ? "Check Out" : row.Status}</TableCell>
                          <TableCell>
                            {row._valid ? (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-200">OK</Badge>
                            ) : (
                              <span className="flex items-center text-xs text-red-600 gap-1">
                                <FileWarning className="w-3.5 h-3.5" /> {row._error}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={handleImportBiometric} disabled={!selectedDevice || bioValidCount === 0 || isProcessingBio}>
                    {isProcessingBio ? "Processing Hardware Logs..." : `Import ${bioValidCount} Biometric Logs`}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Global Alert Modal */}
      <AlertDialog open={alertDialog.open} onOpenChange={(open) => setAlertDialog((prev) => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlertDialog((prev) => ({ ...prev, open: false }))}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
