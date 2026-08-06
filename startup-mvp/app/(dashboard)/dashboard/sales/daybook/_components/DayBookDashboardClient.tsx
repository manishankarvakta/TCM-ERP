"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { 
  Calendar as CalendarIcon, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Eye, 
  Unlock, 
  CheckCircle, 
  MapPin, 
  User, 
  DollarSign, 
  TrendingUp, 
  FileText 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  getDailyWarehouseClosings, 
  verifyPOSClosingSession, 
  reopenPOSClosingSession, 
  getBillersForWarehouse 
} from "../_actions/daybook.action";
import POSClosingModal from "./POSClosingModal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DayBookDashboardClientProps {
  warehouses: Array<{ id: string; name: string }>;
  isAdmin: boolean;
  defaultWarehouseId: string;
  currentUserId: string;
}

export default function DayBookDashboardClient({
  warehouses,
  isAdmin,
  defaultWarehouseId,
  currentUserId,
}: DayBookDashboardClientProps) {
  // Initialize date in Dhaka time GMT+6
  const getDhakaTodayStr = () => {
    const d = new Date();
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const dhakaOffset = 6 * 3600000; // GMT+6 in ms
    const dhakaDate = new Date(utc + dhakaOffset);
    return dhakaDate.toISOString().split("T")[0];
  };

  const [date, setDate] = useState<string>(getDhakaTodayStr());
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(
    isAdmin ? "all" : defaultWarehouseId
  );
  const [closings, setClosings] = useState<any[]>([]);
  const [billers, setBillers] = useState<any[]>([]);
  const [selectedClosing, setSelectedClosing] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isClosingModalOpen, setIsClosingModalOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({ open: false, title: "", description: "", onConfirm: () => {} });
  const [alertDialog, setAlertDialog] = useState<{ open: boolean; title: string; description: string }>({ open: false, title: "", description: "" });

  const warehouseOptions = React.useMemo(() => {
    const list = (warehouses || []).map((w) => ({
      label: w.name,
      value: w.id
    }));
    if (isAdmin) {
      return [{ label: "All Warehouse", value: "all" }, ...list];
    }
    return list;
  }, [warehouses, isAdmin]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!selectedWarehouseId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [closingsRes, billersRes] = await Promise.all([
        getDailyWarehouseClosings(date, selectedWarehouseId),
        getBillersForWarehouse(selectedWarehouseId),
      ]);

      if (closingsRes.success) {
        setClosings(closingsRes.closings || []);
        // Maintain selection if it still exists
        if (selectedClosing) {
          const updated = closingsRes.closings.find((c: any) => c.id === selectedClosing.id);
          setSelectedClosing(updated || null);
        }
      } else {
        setError(closingsRes.error || "Failed to load closings.");
      }

      if (billersRes.success) {
        setBillers(billersRes.billers || []);
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred while loading data.");
    } finally {
      setIsLoading(false);
    }
  }, [date, selectedWarehouseId, selectedClosing]);

  useEffect(() => {
    fetchData();
  }, [date, selectedWarehouseId]);

  const handleVerify = (id: string) => {
    setConfirmDialog({
      open: true,
      title: "Verify & Lock Session",
      description: "Are you sure you want to verify and lock this POS closing session?",
      onConfirm: async () => {
        try {
          const res = await verifyPOSClosingSession(id);
          if (res.success) {
            fetchData();
          } else {
            setAlertDialog({ open: true, title: "Verification Failed", description: res.error || "Failed to verify session." });
          }
        } catch (err) {
          console.error(err);
          setAlertDialog({ open: true, title: "Error", description: "Error verifying session." });
        }
      }
    });
  };

  const handleReopen = (id: string) => {
    setConfirmDialog({
      open: true,
      title: "Reopen Session",
      description: "Are you sure you want to reopen this POS closing session for edits?",
      onConfirm: async () => {
        try {
          const res = await reopenPOSClosingSession(id);
          if (res.success) {
            fetchData();
          } else {
            setAlertDialog({ open: true, title: "Reopen Failed", description: res.error || "Failed to reopen session." });
          }
        } catch (err) {
          console.error(err);
          setAlertDialog({ open: true, title: "Error", description: "Error reopening session." });
        }
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1 w-fit"><CheckCircle className="h-3 w-3" /> Verified</Badge>;
      case "CLOSED":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1 w-fit"><CheckCircle2 className="h-3 w-3" /> Closed</Badge>;
      default:
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 w-fit"><AlertCircle className="h-3 w-3" /> Draft</Badge>;
    }
  };

  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return "0.00";
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="text-indigo-600 h-8 w-8" /> POS Daybook
          </h1>
          <p className="text-slate-500 mt-1">Daily register closing and drawer reconciliation logs.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Warehouse Selector */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-950 p-1 rounded-lg border shadow-sm">
            <MapPin className="text-slate-400 h-4 w-4 ml-1" />
            <SearchableSelect
              options={warehouseOptions}
              value={selectedWarehouseId}
              onValueChange={(val) => setSelectedWarehouseId(val || "all")}
              disabled={!isAdmin}
              className="w-56 h-8 text-xs font-semibold bg-transparent border-none shadow-none focus:ring-0"
              placeholder="Select Warehouse..."
            />
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-950 p-2 rounded-lg border shadow-sm">
            <CalendarIcon className="text-slate-400 h-4 w-4" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-sm font-semibold border-none focus:outline-none cursor-pointer"
            />
          </div>

          <Button 
            onClick={fetchData} 
            variant="outline" 
            size="icon"
            disabled={isLoading}
            className="bg-white dark:bg-slate-950 shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          <Button 
            onClick={() => {
              setSelectedClosing(null); // Clear selected closing when opening new form
              setIsClosingModalOpen(true);
            }} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> POS Closing
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-3 border border-red-100 dark:border-red-900/50">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Middle Column: Cashier Closing Sessions Table */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border border-slate-100">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-950/20 py-4">
              <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">Cashier Closings</CardTitle>
              <CardDescription>All closing records for the selected warehouse on {format(new Date(date), "PPP")}.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Biller / Cashier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Opening Cash</TableHead>
                    <TableHead className="text-right">Cash In Hand</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead className="pr-6 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-slate-400">
                        No closing sessions registered for this date.
                      </TableCell>
                    </TableRow>
                  ) : (
                    closings.map((c) => (
                      <TableRow 
                        key={c.id} 
                        className={`cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-950/10 ${selectedClosing?.id === c.id ? "bg-indigo-50/20 dark:bg-indigo-950/10 border-l-4 border-l-indigo-600" : ""}`}
                        onClick={() => setSelectedClosing(c)}
                      >
                        <TableCell className="font-semibold pl-6">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                              {c.biller.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div>{c.biller.name}</div>
                              <div className="text-xs text-slate-400 font-normal">{c.biller.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(c.status)}</TableCell>
                        <TableCell className="text-right font-medium text-slate-600 dark:text-slate-400">{formatNumber(c.openingCash)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatNumber(c.cashInHand)}</TableCell>
                        <TableCell className={`text-right font-bold ${c.difference < 0 ? "text-rose-600" : c.difference > 0 ? "text-emerald-600" : "text-slate-600 dark:text-slate-400"}`}>
                          {c.difference > 0 ? "+" : ""}{formatNumber(c.difference)}
                        </TableCell>
                        <TableCell className="pr-6 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setSelectedClosing(c)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {c.status === "CLOSED" && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                onClick={() => handleVerify(c.id)}
                                title="Verify / Lock"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}

                            {c.status === "VERIFIED" && isAdmin && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                onClick={() => handleReopen(c.id)}
                                title="Re-open Session"
                              >
                                <Unlock className="h-4 w-4" />
                              </Button>
                            )}

                            {c.status === "DRAFT" && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-indigo-600 hover:text-indigo-700"
                                onClick={() => {
                                  setSelectedClosing(c);
                                  setIsClosingModalOpen(true);
                                }}
                                title="Edit Draft"
                              >
                                <Plus className="h-4 w-4 rotate-45" /> {/* Edit Icon placeholder */}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Detailed Reconciliation / Audit View */}
        <div className="lg:col-span-1">
          {selectedClosing ? (
            <Card className="shadow-sm border border-slate-100 sticky top-6">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-950/20 py-4 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-md font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-indigo-500" /> Closing Audit details
                  </CardTitle>
                  {getStatusBadge(selectedClosing.status)}
                </div>
                <CardDescription className="mt-1">
                  Reconciled by {selectedClosing.biller.name}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-5 space-y-6 text-sm">
                {/* Float calculation section */}
                <div>
                  <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider mb-2">Cash Flow Summary</h4>
                  <div className="space-y-1.5 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Opening Float:</span>
                      <span className="font-medium">{formatNumber(selectedClosing.openingCash)}</span>
                    </div>
                    {/* Retrieve Cash collections */}
                    {selectedClosing.collections.filter((col: any) => col.paymentMethodName.toLowerCase().includes("cash")).map((col: any) => (
                      <React.Fragment key={col.id}>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Cash Sales:</span>
                          <span className="font-medium">{formatNumber(Number(col.regularCollection))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Due Collection (Cash):</span>
                          <span className="font-medium">{formatNumber(Number(col.duesCollection))}</span>
                        </div>
                      </React.Fragment>
                    ))}
                    <div className="flex justify-between text-rose-600">
                      <span>Cash Out / Drops:</span>
                      <span className="font-medium">-{formatNumber(selectedClosing.cashOut)}</span>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span>Office Bill / Expenses:</span>
                      <span className="font-medium">-{formatNumber(selectedClosing.officeBill)}</span>
                    </div>
                    <div className="border-t pt-1.5 flex justify-between font-bold text-slate-800 dark:text-slate-200">
                      <span>Expected Cash in Drawer:</span>
                      <span>{formatNumber(selectedClosing.availableCash)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-950 dark:text-white bg-indigo-50/30 dark:bg-indigo-950/20 p-1.5 rounded mt-1">
                      <span>Physical Cash Counted:</span>
                      <span>{formatNumber(selectedClosing.cashInHand)}</span>
                    </div>
                  </div>
                </div>

                {/* Gateways/Terminals Breakdown */}
                <div>
                  <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider mb-2">Gateway Collections</h4>
                  <div className="border rounded-lg overflow-hidden border-slate-100">
                    <Table>
                      <TableHeader className="bg-slate-50/50 dark:bg-slate-900/30">
                        <TableRow className="h-8">
                          <TableHead className="h-8 text-xs py-1.5">Method</TableHead>
                          <TableHead className="h-8 text-xs text-right py-1.5">System</TableHead>
                          <TableHead className="h-8 text-xs text-right py-1.5">Received</TableHead>
                          <TableHead className="h-8 text-xs text-right py-1.5">Diff</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedClosing.collections.map((col: any) => (
                          <TableRow key={col.id} className="h-8 hover:bg-transparent">
                            <TableCell className="py-1 text-xs font-semibold">{col.paymentMethodName}</TableCell>
                            <TableCell className="py-1 text-xs text-right text-slate-600">{formatNumber(Number(col.totalCollection))}</TableCell>
                            <TableCell className="py-1 text-xs text-right font-medium">{formatNumber(Number(col.totalReceived))}</TableCell>
                            <TableCell className={`py-1 text-xs text-right font-bold ${Number(col.difference) < 0 ? "text-rose-600" : Number(col.difference) > 0 ? "text-emerald-600" : "text-slate-600"}`}>
                              {formatNumber(Number(col.difference))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Cash note count */}
                {selectedClosing.denominations && (
                  <div>
                    <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider mb-2">Denominations Track</h4>
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/30 p-3 rounded-lg border text-xs">
                      {Object.entries(selectedClosing.denominations)
                        .filter(([key]) => key.startsWith("note"))
                        .map(([key, val]) => {
                          const noteVal = parseInt(key.replace("note", ""));
                          const count = val as number;
                          if (count === 0) return null;
                          return (
                            <div key={key} className="flex justify-between border-b border-dashed pb-0.5">
                              <span className="text-slate-500 font-semibold">{noteVal} ৳ x {count}</span>
                              <span className="font-bold text-slate-700 dark:text-slate-300">{formatNumber(noteVal * count)}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* General metadata */}
                <div className="space-y-1 text-xs text-slate-400 border-t pt-4">
                  <div>Date Logged: {format(new Date(selectedClosing.createdAt), "PPpp")}</div>
                  {selectedClosing.verifier && (
                    <div className="text-emerald-600 font-medium">Verified by: {selectedClosing.verifier.name} {selectedClosing.verifiedAt && `at ${format(new Date(selectedClosing.verifiedAt), "PPpp")}`}</div>
                  )}
                  {selectedClosing.notes && (
                    <div className="mt-2 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded border italic text-slate-600 dark:text-slate-400">
                      &ldquo;{selectedClosing.notes}&rdquo;
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-slate-400 sticky top-6">
              <User className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-1">Select a Closing Record</h3>
              <p className="text-xs">Click on any cashier's row in the table to display full physical cash audit details, note counts, and differences.</p>
            </Card>
          )}
        </div>

      </div>

      {/* POS Closing Modal */}
      <POSClosingModal
        isOpen={isClosingModalOpen}
        onClose={() => setIsClosingModalOpen(false)}
        onSaveSuccess={() => {
          setIsClosingModalOpen(false);
          fetchData();
        }}
        dateStr={date}
        warehouseId={selectedWarehouseId === "all" ? (warehouses[0]?.id || "") : selectedWarehouseId}
        warehouseName={selectedWarehouseId === "all" ? (warehouses[0]?.name || "") : (warehouses.find(w => w.id === selectedWarehouseId)?.name || "")}
        billers={billers}
        currentUserId={currentUserId}
        savedSession={selectedClosing?.status === "DRAFT" ? selectedClosing : null}
      />

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const action = confirmDialog.onConfirm;
                setConfirmDialog(prev => ({ ...prev, open: false }));
                action();
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog */}
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
