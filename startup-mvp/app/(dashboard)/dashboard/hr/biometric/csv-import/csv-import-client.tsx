"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UploadCloud, CheckCircle2, AlertCircle, FileWarning } from "lucide-react";

type Device = { id: string; name: string; serialNumber: string | null };

type CsvRow = {
  PIN: string;
  Time: string;
  DeviceID: string;
  Status: string;
  Verified: string;
  WorkCode: string;
  _valid: boolean;
  _error?: string;
};

export default function CsvImportClient({ devices }: { devices: Device[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [alertDialog, setAlertDialog] = useState<{ open: boolean; title: string; description: string }>({ open: false, title: "", description: "" });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      
      const parsedRows: CsvRow[] = [];
      
      // Skip header if it exists
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

          if (!PIN) { _valid = false; _error = "Missing PIN"; }
          else if (!Time) { _valid = false; _error = "Missing Time"; }
          else if (isNaN(Date.parse(Time))) { _valid = false; _error = "Invalid Time format"; }
          else if (!["0", "1", "2", "3", "4", "5"].includes(Status)) { _valid = false; _error = "Invalid Status"; }

          parsedRows.push({ PIN, Time, DeviceID, Status, Verified, WorkCode, _valid, _error });
        }
      }
      setRows(parsedRows);
    };
    reader.readAsText(uploadedFile);
  };

  const handleImport = async () => {
    if (!selectedDevice) {
      setAlertDialog({ open: true, title: "Device Required", description: "Please select a device first." });
      return;
    }
    if (rows.length === 0) {
      setAlertDialog({ open: true, title: "No Data", description: "No valid data to import." });
      return;
    }

    setIsProcessing(true);
    setSummary(null);

    const validRows = rows.filter(r => r._valid);

    try {
      const response = await fetch("/api/hr/biometric/csv-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: selectedDevice, rows: validRows }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to import");

      setSummary({
        totalRows: rows.length,
        invalidRows: rows.length - validRows.length,
        ...data.summary
      });
      setRows([]);
      setFile(null);
    } catch (err: any) {
      setAlertDialog({ open: true, title: "Import Failed", description: err.message || "An unexpected error occurred." });
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = rows.filter(r => r._valid).length;
  const invalidCount = rows.length - validCount;

  return (
    <div className="space-y-6">
      {summary && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Import Complete</AlertTitle>
          <AlertDescription className="text-green-700 mt-2">
            <ul className="list-disc pl-5 space-y-1">
              <li>Total Rows Parsed: {summary.totalRows}</li>
              <li>Invalid Rows Skipped (Frontend): {summary.invalidRows}</li>
              <li>Duplicate Rows Skipped (Database): {summary.duplicatesSkipped}</li>
              <li>Rows Failed (Backend): {summary.failedCount}</li>
              <li>Successfully Imported & Queued: <span className="font-bold">{summary.importedCount}</span></li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">1. Select Target Device</label>
          <SearchableSelect
            value={selectedDevice}
            onValueChange={(val) => setSelectedDevice(val || "")}
            placeholder="Select a biometric device..."
            options={devices.map(d => ({
              value: d.id,
              label: d.name,
              description: d.serialNumber || undefined
            }))}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">2. Upload CSV File</label>
          <Input type="file" accept=".csv, .txt" onChange={handleFileUpload} disabled={isProcessing} />
        </div>
      </div>

      {rows.length > 0 && (
        <div className="space-y-4 border rounded-md p-4 bg-slate-50">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-lg">Preview</h3>
            <div className="flex gap-2">
              <Badge variant="outline">{rows.length} Total</Badge>
              <Badge variant="default" className="bg-green-600">{validCount} Valid</Badge>
              {invalidCount > 0 && <Badge variant="destructive">{invalidCount} Invalid</Badge>}
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto border rounded-md bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PIN</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Validation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 50).map((row, i) => (
                  <TableRow key={i} className={!row._valid ? "bg-red-50" : ""}>
                    <TableCell className="font-mono">{row.PIN}</TableCell>
                    <TableCell>{row.Time}</TableCell>
                    <TableCell>{row.Status}</TableCell>
                    <TableCell>
                      {row._valid ? (
                        <Badge variant="outline" className="text-green-600 border-green-200">OK</Badge>
                      ) : (
                        <span className="flex items-center text-xs text-red-600 gap-1">
                          <FileWarning className="w-3 h-3" /> {row._error}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {rows.length > 50 && <p className="text-xs text-muted-foreground text-center">Showing first 50 rows</p>}

          <div className="flex justify-end pt-4">
            <Button onClick={handleImport} disabled={!selectedDevice || validCount === 0 || isProcessing}>
              {isProcessing ? "Processing..." : `Import ${validCount} Valid Rows`}
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={alertDialog.open} onOpenChange={(open) => setAlertDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlertDialog(prev => ({ ...prev, open: false }))}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
