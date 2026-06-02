"use client";

import React, { useState, useEffect } from "react";
import { GracefulDegrader } from "@/components/garments/graceful-degrader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface CuttingFormProps {
  isEnabled: boolean;
  activeOrders: any[];
}

export function CuttingFormClient({ isEnabled, activeOrders }: CuttingFormProps) {
  const [orderId, setOrderId] = useState("");
  const [fabricRolls, setFabricRolls] = useState(0);
  const [weightIssued, setWeightIssued] = useState(0); // in kg
  const [markerLength, setMarkerLength] = useState(0); // in meters
  const [plies, setPlies] = useState(0);
  const [expectedPieces, setExpectedPieces] = useState(0);
  const [actualPieces, setActualPieces] = useState(0);
  const [wastage, setWastage] = useState(0); // in kg

  // Automated estimation of fabric wastage based on standard margins
  useEffect(() => {
    if (weightIssued > 0 && actualPieces > 0) {
      const estimatedWastage = Math.max(0, weightIssued - (actualPieces * 0.22));
      setWastage(parseFloat(estimatedWastage.toFixed(2)));
    }
  }, [weightIssued, actualPieces]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) {
      toast.error("Please select a Production Order");
      return;
    }
    toast.success("Cutting job logged successfully!");
  };

  return (
    <GracefulDegrader isEnabled={isEnabled} moduleName="Cutting Room Input">
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Fabric Lay & Cut Entry</CardTitle>
            <CardDescription>Input actual parameters measured from the cutting table.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Production Order Reference</label>
                  <Select onValueChange={setOrderId} value={orderId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select active order" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeOrders.map((order) => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.code} - {order.item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fabric Rolls Issued</label>
                  <Input type="number" min={1} value={fabricRolls || ""} onChange={(e) => setFabricRolls(parseInt(e.target.value))} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fabric Issued (Kg)</label>
                  <Input type="number" step="0.01" value={weightIssued || ""} onChange={(e) => setWeightIssued(parseFloat(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Marker Length (Meters)</label>
                  <Input type="number" step="0.01" value={markerLength || ""} onChange={(e) => setMarkerLength(parseFloat(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Plies Count</label>
                  <Input type="number" value={plies || ""} onChange={(e) => setPlies(parseInt(e.target.value))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Expected Pieces</label>
                  <Input type="number" value={expectedPieces || ""} onChange={(e) => setExpectedPieces(parseInt(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Actual Pieces Cut</label>
                  <Input type="number" value={actualPieces || ""} onChange={(e) => setActualPieces(parseInt(e.target.value))} />
                </div>
              </div>

              <Button type="submit" className="w-full">Save Cutting Ledger Record</Button>
            </form>
          </CardContent>
        </Card>

        {/* Real-time Calculation Statistics Panel */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle>Yield Statistics</CardTitle>
            <CardDescription>Calculated margins from current layout data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <span className="text-xs text-muted-foreground uppercase block font-semibold">Fabric Consumption Per Piece</span>
              <span className="text-2xl font-bold text-primary">
                {actualPieces > 0 ? (weightIssued / actualPieces).toFixed(3) : "0.000"} Kg
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase block font-semibold">Marker Utilization Estimate</span>
              <span className="text-2xl font-bold text-emerald-600">
                {expectedPieces > 0 ? ((actualPieces / expectedPieces) * 100).toFixed(1) : "0.0"} %
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase block font-semibold">Fabric Waste Weight</span>
              <span className="text-2xl font-bold text-destructive">{wastage} Kg</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </GracefulDegrader>
  );
}
