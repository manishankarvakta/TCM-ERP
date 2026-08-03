"use client";

import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Calculator, RefreshCw, X } from "lucide-react";
import { getPOSClosingData, savePOSClosingSession } from "../_actions/daybook.action";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface POSClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
  dateStr: string;
  warehouseId: string;
  warehouseName: string;
  billers: Array<{ id: string; name: string; email: string }>;
  currentUserId: string;
  savedSession?: any | null;
}

export default function POSClosingModal({
  isOpen,
  onClose,
  onSaveSuccess,
  dateStr,
  warehouseId,
  warehouseName,
  billers,
  currentUserId,
  savedSession
}: POSClosingModalProps) {
  const [selectedBillerId, setSelectedBillerId] = useState<string>(
    savedSession?.billerId || currentUserId
  );
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // System calculated states
  const [collections, setCollections] = useState<any[]>([]);
  const [todaysCreditSales, setTodaysCreditSales] = useState<number>(0);
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);
  
  // Cashier inputs
  const [openingCash, setOpeningCash] = useState<number>(savedSession?.openingCash || 0);
  const [cashOut, setCashOut] = useState<number>(savedSession?.cashOut || 0);
  const [officeBill, setOfficeBill] = useState<number>(savedSession?.officeBill || 0);
  const [notes, setNotes] = useState<string>(savedSession?.notes || "");
  
  // Declared total received mapping by account name/method
  const [receivedMap, setReceivedMap] = useState<Record<string, number>>({});
  
  // Cash Denomination inputs
  const [denominations, setDenominations] = useState({
    note1000: savedSession?.denominations?.note1000 || 0,
    note500: savedSession?.denominations?.note500 || 0,
    note200: savedSession?.denominations?.note200 || 0,
    note100: savedSession?.denominations?.note100 || 0,
    note50: savedSession?.denominations?.note50 || 0,
    note20: savedSession?.denominations?.note20 || 0,
    note10: savedSession?.denominations?.note10 || 0,
    note5: savedSession?.denominations?.note5 || 0,
    note2: savedSession?.denominations?.note2 || 0,
    note1: savedSession?.denominations?.note1 || 0,
  });

  // Load calculations when biller changes or modal opens
  useEffect(() => {
    async function loadBillerClosingData() {
      if (!selectedBillerId || !isOpen) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await getPOSClosingData(selectedBillerId, warehouseId, dateStr);
        if (res.success) {
          setCollections(res.collections || []);
          setTodaysCreditSales(res.todaysCreditSales || 0);
          setLoyaltyPoints(res.loyaltyPoints || 0);
          
          const map: Record<string, number> = {};
          if (res.savedSession) {
            const saved = res.savedSession;
            setOpeningCash(saved.openingCash);
            setCashOut(saved.cashOut);
            setOfficeBill(saved.officeBill);
            setNotes(saved.notes || "");
            
            if (saved.denominations) {
              setDenominations({
                note1000: saved.denominations.note1000,
                note500: saved.denominations.note500,
                note200: saved.denominations.note200,
                note100: saved.denominations.note100,
                note50: saved.denominations.note50,
                note20: saved.denominations.note20,
                note10: saved.denominations.note10,
                note5: saved.denominations.note5,
                note2: saved.denominations.note2,
                note1: saved.denominations.note1,
              });
            }

            for (const col of saved.collections) {
              map[col.paymentMethodName] = Number(col.totalReceived);
            }
          } else {
            setOpeningCash(0);
            setCashOut(0);
            setOfficeBill(0);
            setNotes("");
            setDenominations({
              note1000: 0, note500: 0, note200: 0, note100: 0, note50: 0,
              note20: 0, note10: 0, note5: 0, note2: 0, note1: 0,
            });

            for (const col of res.collections || []) {
              map[col.name] = Number(col.totalCollection);
            }
          }
          setReceivedMap(map);
        } else {
          setError(res.error || "Failed to load expected sales data.");
        }
      } catch (err) {
        console.error(err);
        setError("Error loading expected calculations.");
      } finally {
        setIsLoading(false);
      }
    }

    loadBillerClosingData();
  }, [selectedBillerId, warehouseId, dateStr, isOpen]);

  // Synchronize/reset state variables when modal triggers open
  useEffect(() => {
    if (isOpen) {
      if (savedSession) {
        setOpeningCash(savedSession.openingCash || 0);
        setCashOut(savedSession.cashOut || 0);
        setOfficeBill(savedSession.officeBill || 0);
        setNotes(savedSession.notes || "");
        setSelectedBillerId(savedSession.billerId);
        if (savedSession.denominations) {
          setDenominations({
            note1000: savedSession.denominations.note1000 || 0,
            note500: savedSession.denominations.note500 || 0,
            note200: savedSession.denominations.note200 || 0,
            note100: savedSession.denominations.note100 || 0,
            note50: savedSession.denominations.note50 || 0,
            note20: savedSession.denominations.note20 || 0,
            note10: savedSession.denominations.note10 || 0,
            note5: savedSession.denominations.note5 || 0,
            note2: savedSession.denominations.note2 || 0,
            note1: savedSession.denominations.note1 || 0,
          });
        }
      } else {
        setSelectedBillerId(currentUserId);
        setOpeningCash(0);
        setCashOut(0);
        setOfficeBill(0);
        setNotes("");
        setDenominations({
          note1000: 0, note500: 0, note200: 0, note100: 0, note50: 0,
          note20: 0, note10: 0, note5: 0, note2: 0, note1: 0,
        });
        setReceivedMap({});
        setCollections([]);
      }
    }
  }, [isOpen, savedSession, currentUserId]);

  // Denominations sum calculation
  const totalCashCounted = 
    1000 * denominations.note1000 +
    500 * denominations.note500 +
    200 * denominations.note200 +
    100 * denominations.note100 +
    50 * denominations.note50 +
    20 * denominations.note20 +
    10 * denominations.note10 +
    5 * denominations.note5 +
    2 * denominations.note2 +
    1 * denominations.note1;

  // Retrieve cash account system calculations
  const getCashSalesSystemExpected = () => {
    const cashAcc = collections.find(c => c.type === "CASH");
    return cashAcc ? Number(cashAcc.totalCollection) : 0;
  };

  const handleReceivedChange = (name: string, val: string) => {
    const numVal = Number(val) || 0;
    setReceivedMap(prev => ({
      ...prev,
      [name]: numVal
    }));
  };

  // Available Cash calculation: Opening Cash + Cash Sales + Due Collection (Cash) - Cash out - Office Bill
  const availableCashInDrawer = 
    Number(openingCash) + 
    Number(getCashSalesSystemExpected()) - 
    Number(cashOut) - 
    // We deduct office bill (expenses) from the available cash float
    Number(officeBill);

  const cashDiscrepancy = totalCashCounted - availableCashInDrawer;

  const handleDenominationChange = (key: keyof typeof denominations, val: string) => {
    const count = parseInt(val) || 0;
    setDenominations(prev => ({
      ...prev,
      [key]: count
    }));
  };

  // Calculate left side grid column totals
  const totalRegularExpected = collections.reduce((sum, col) => sum + Number(col.regularCollection), 0);
  const totalDuesExpected = collections.reduce((sum, col) => sum + Number(col.duesCollection), 0);
  const totalCollectionExpected = collections.reduce((sum, col) => sum + Number(col.totalCollection), 0);
  
  // Calculate total declared/received across all columns
  const totalCollectionReceived = collections.reduce((sum, col) => {
    const isCash = col.type === "CASH";
    const declared = isCash ? totalCashCounted : (receivedMap[col.name] ?? col.totalCollection);
    return sum + declared;
  }, 0);

  // Overall difference / discrepancy incorporating float adjustments for Cash drawer
  const cashDifference = totalCashCounted - availableCashInDrawer;
  const nonCashDifference = collections
    .filter(col => col.type !== "CASH")
    .reduce((sum, col) => {
      const declared = receivedMap[col.name] ?? col.totalCollection;
      return sum + (declared - col.totalCollection);
    }, 0);
  const totalDiscrepancy = cashDifference + nonCashDifference;

  const handleSave = async (status: "DRAFT" | "CLOSED") => {
    setIsLoading(true);
    setError(null);
    try {
      const collectionsPayload = collections.map((col) => {
        const isCash = col.type === "CASH";
        const declared = isCash ? totalCashCounted : (receivedMap[col.name] ?? col.totalCollection);
        const diff = isCash 
          ? (totalCashCounted - availableCashInDrawer)
          : (declared - col.totalCollection);

        return {
          paymentMethodName: col.name,
          regularCollection: col.regularCollection,
          duesCollection: col.duesCollection,
          totalCollection: col.totalCollection,
          totalReceived: declared,
          difference: Number(diff.toFixed(2))
        };
      });

      const payload = {
        billerId: selectedBillerId,
        warehouseId,
        dateStr,
        status,
        openingCash: Number(openingCash),
        cashOut: Number(cashOut),
        officeBill: Number(officeBill),
        cashInHand: totalCashCounted,
        availableCash: availableCashInDrawer,
        difference: cashDiscrepancy,
        todaysCreditSales,
        loyaltyPoints,
        notes,
        denominations,
        collections: collectionsPayload
      };

      const res = await savePOSClosingSession(payload);
      if (res.success) {
        onSaveSuccess();
      } else {
        setError(res.error || "Failed to save closing session.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const billerOptions = (billers || []).map((b) => ({
    label: b.name,
    value: b.id,
    description: b.email,
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] md:max-w-6xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-950 p-6 rounded-lg border shadow-2xl">
        <DialogHeader className="border-b pb-3 mb-4">
          <DialogTitle className="text-xl font-bold flex flex-row items-center gap-6 w-full">
            <span className="flex items-center gap-2 text-slate-900 dark:text-white shrink-0">
              <Calculator className="text-indigo-600 h-5 w-5" /> POS Register Closing
            </span>
            
            <div className="flex items-center gap-2 font-normal">
              <Label className="text-slate-800 dark:text-slate-200 font-bold text-sm shrink-0">Select Biller:</Label>
              <SearchableSelect
                options={billerOptions}
                value={selectedBillerId}
                onValueChange={(val) => setSelectedBillerId(val || "")}
                disabled={isLoading || !!savedSession}
                className="w-64 h-9 text-xs font-bold bg-white dark:bg-slate-900 border-slate-200 shadow-sm"
                placeholder="Select Biller..."
              />
            </div>
            
            <div className="ml-auto">
              <span className="text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-3.5 py-1.5 rounded shrink-0">
                Warehouse: {warehouseName}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 mb-4 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg flex items-center gap-2 border border-rose-100 dark:border-rose-900/50 text-xs">
            <AlertCircle className="h-4 w-4" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
          
          {/* LEFT SIDE: Sales Overview Grid (col-span-8) */}
          <div className="lg:col-span-8 space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 border-b pb-1">Sales OverView:</h3>
            
            <div className="border border-slate-200 rounded overflow-x-auto">
              <Table className="min-w-full divide-y divide-slate-200 border-collapse">
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                  <TableRow className="h-9 hover:bg-transparent">
                    <TableHead className="font-bold text-slate-700 dark:text-slate-200 border border-slate-200 py-1.5 px-3">Name</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-200 border border-slate-200 text-right py-1.5 px-3 w-32">Regular Collection</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-200 border border-slate-200 text-right py-1.5 px-3 w-32">Dues Collection</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-200 border border-slate-200 text-right py-1.5 px-3 w-32">Total Collection</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-200 border border-slate-200 text-right py-1.5 px-3 w-36">Total Recieved</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-200 bg-white dark:bg-slate-950">
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 border border-slate-200">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
                      </TableCell>
                    </TableRow>
                  ) : collections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 border border-slate-200 text-slate-400 font-medium">
                        No sales found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    collections.map((col) => {
                      const isCash = col.type === "CASH";
                      const declared = isCash ? totalCashCounted : (receivedMap[col.name] ?? col.totalCollection);
                      
                      return (
                        <TableRow key={col.id} className="hover:bg-transparent h-9">
                          <TableCell className="font-bold text-slate-800 dark:text-slate-200 border border-slate-200 py-1.5 px-3 bg-slate-50/50">
                            {col.name}
                          </TableCell>
                          <TableCell className="text-right border border-slate-200 py-1.5 px-3 text-slate-600">
                            {col.regularCollection.toFixed(0)}
                          </TableCell>
                          <TableCell className="text-right border border-slate-200 py-1.5 px-3 text-slate-600">
                            {col.duesCollection.toFixed(0)}
                          </TableCell>
                          <TableCell className="text-right border border-slate-200 py-1.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                            {col.totalCollection.toFixed(0)}
                          </TableCell>
                          <TableCell className="text-right border border-slate-200 py-1 px-2">
                            {isCash ? (
                              <Input
                                type="text"
                                disabled
                                value={totalCashCounted.toFixed(0)}
                                className="h-7 text-right font-bold text-xs bg-slate-50 border-slate-200 cursor-not-allowed select-none px-2 rounded-none"
                              />
                            ) : (
                              <Input
                                type="number"
                                placeholder="0"
                                value={receivedMap[col.name] ?? ""}
                                onChange={(e) => handleReceivedChange(col.name, e.target.value)}
                                className="h-7 text-right font-medium text-xs border border-slate-300 focus:border-indigo-600 focus:ring-0 px-2 rounded-none"
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}

                  {/* Summary row */}
                  {!isLoading && collections.length > 0 && (
                    <TableRow className="bg-slate-50 dark:bg-slate-900/50 font-bold h-9">
                      <TableCell className="border border-slate-200 py-1.5 px-3 text-right">Total:</TableCell>
                      <TableCell className="text-right border border-slate-200 py-1.5 px-3">{totalRegularExpected.toFixed(0)}</TableCell>
                      <TableCell className="text-right border border-slate-200 py-1.5 px-3">{totalDuesExpected.toFixed(0)}</TableCell>
                      <TableCell className="text-right border border-slate-200 py-1.5 px-3">{totalCollectionExpected.toFixed(0)}</TableCell>
                      <TableCell className="text-right border border-slate-200 py-1.5 px-3">{totalCollectionReceived.toFixed(0)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Bottom summary fields */}
            {!isLoading && (
              <div className="grid grid-cols-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 p-2.5 rounded font-bold text-slate-800 dark:text-slate-100 text-xs">
                <div>Todays Credit Sales: {todaysCreditSales.toFixed(0)}</div>
                <div>Loyalty Point: {loyaltyPoints}</div>
                <div className="flex justify-end items-center gap-2">
                  <span>Difference:</span>
                  <span className={`${totalDiscrepancy < 0 ? "text-rose-600" : totalDiscrepancy > 0 ? "text-emerald-600" : ""}`}>
                    {totalDiscrepancy.toFixed(0)}
                  </span>
                </div>
              </div>
            )}
            
            <div className="mt-4">
              <Label className="font-bold text-slate-700 dark:text-slate-300">Closing Comments</Label>
              <Textarea
                placeholder="Enter register closing comments..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 resize-none h-16 text-xs border-slate-200 focus:border-indigo-500 focus:ring-0 rounded"
              />
            </div>
          </div>

          {/* RIGHT SIDE: Cash Denomination Table (col-span-4) */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 border-b pb-1">Cash Denomination:</h3>
            
            <div className="border border-slate-200 rounded">
              <Table className="min-w-full divide-y divide-slate-200 border-collapse">
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                  <TableRow className="h-9 hover:bg-transparent">
                    <TableHead className="font-bold text-slate-700 dark:text-slate-200 border border-slate-200 py-1.5 px-3">Particulars</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-200 border border-slate-200 text-center py-1.5 px-3 w-28">Unit</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-200 border border-slate-200 text-right py-1.5 px-3 w-28">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-200 bg-white dark:bg-slate-950">
                  {[1000, 500, 200, 100, 50, 20, 10, 5, 2, 1].map((note) => {
                    const key = `note${note}` as keyof typeof denominations;
                    return (
                      <TableRow key={note} className="hover:bg-transparent h-9">
                        <TableCell className="font-bold text-center border border-slate-200 py-1.5 px-3 bg-slate-50/20">
                          {note}
                        </TableCell>
                        <TableCell className="border border-slate-200 py-1 px-2 text-center">
                          <Input
                            type="number"
                            placeholder="0"
                            min="0"
                            value={denominations[key] || ""}
                            onChange={(e) => handleDenominationChange(key, e.target.value)}
                            className="h-7 text-center font-semibold text-xs border border-slate-300 focus:border-indigo-600 focus:ring-0 w-20 mx-auto px-1 rounded-none"
                          />
                        </TableCell>
                        <TableCell className="text-right border border-slate-200 py-1.5 px-3 font-semibold text-slate-600">
                          {(note * (denominations[key] || 0)).toFixed(0)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Calculations layout matching right column lower panel */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <Table className="min-w-full divide-y divide-slate-200 border-collapse text-xs">
                <TableBody>
                  <TableRow className="hover:bg-transparent h-9">
                    <TableCell className="font-bold border border-slate-200 py-1.5 px-3 bg-slate-50/30">Cash in Hand</TableCell>
                    <TableCell className="text-right border border-slate-200 py-1.5 px-3 font-extrabold text-slate-800 dark:text-slate-200">
                      {totalCashCounted.toFixed(0)}
                    </TableCell>
                  </TableRow>
                  
                  <TableRow className="hover:bg-transparent h-9">
                    <TableCell className="font-bold border border-slate-200 py-1.5 px-3 bg-slate-50/30">Cash out</TableCell>
                    <TableCell className="border border-slate-200 py-0.5 px-2">
                      <Input
                        type="number"
                        value={cashOut || ""}
                        onChange={(e) => setCashOut(Number(e.target.value) || 0)}
                        className="h-7 text-right font-bold text-xs border border-slate-300 focus:border-indigo-600 rounded-none w-full"
                      />
                    </TableCell>
                  </TableRow>

                  <TableRow className="hover:bg-transparent h-9">
                    <TableCell className="font-bold border border-slate-200 py-1.5 px-3 bg-slate-50/30">Office Bill</TableCell>
                    <TableCell className="border border-slate-200 py-0.5 px-2">
                      <Input
                        type="number"
                        value={officeBill || ""}
                        onChange={(e) => setOfficeBill(Number(e.target.value) || 0)}
                        className="h-7 text-right font-bold text-xs border border-slate-300 focus:border-indigo-600 rounded-none w-full"
                      />
                    </TableCell>
                  </TableRow>

                  <TableRow className="hover:bg-transparent h-9">
                    <TableCell className="font-bold border border-slate-200 py-1.5 px-3 bg-slate-50/30">Opening Cash</TableCell>
                    <TableCell className="border border-slate-200 py-0.5 px-2">
                      <Input
                        type="number"
                        value={openingCash || ""}
                        onChange={(e) => setOpeningCash(Number(e.target.value) || 0)}
                        className="h-7 text-right font-bold text-xs border border-slate-300 focus:border-indigo-600 rounded-none w-full"
                      />
                    </TableCell>
                  </TableRow>

                  <TableRow className="hover:bg-transparent h-9 bg-slate-50 dark:bg-slate-900/50 font-bold">
                    <TableCell className="border border-slate-200 py-1.5 px-3">Available Cash</TableCell>
                    <TableCell className="text-right border border-slate-200 py-1.5 px-3 text-slate-800 dark:text-slate-200">
                      {availableCashInDrawer.toFixed(0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

        </div>

        <DialogFooter className="border-t pt-4 mt-6 flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isLoading}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4 py-2 rounded h-8 shadow-sm"
          >
            Close
          </Button>
          <Button 
            onClick={() => handleSave("DRAFT")} 
            disabled={isLoading || collections.length === 0}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 rounded h-8 shadow-sm border border-slate-200"
          >
            Save Draft
          </Button>
          <Button 
            onClick={() => handleSave("CLOSED")} 
            disabled={isLoading || collections.length === 0}
            className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded h-8 shadow-sm"
          >
            Close Register
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
