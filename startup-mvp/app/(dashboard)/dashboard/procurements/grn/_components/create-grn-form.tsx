"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FiAlertCircle, FiSave, FiCheckCircle } from "react-icons/fi";
import { createGRN, confirmGRN, getPendingPurchasesForWarehouse, getPendingTPNsForWarehouse } from "../_actions/grn.action";
import { createGRNSchema, type GRNFormData } from "../_actions/grn.schema";

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface CreateGRNFormProps {
  warehouses: Warehouse[];
  allowPurchaseSelect: boolean;
  initialPurchase: any;
  initialTpn: any;
  userDefaultWarehouseId?: string | null;
  isNormalUser?: boolean;
}

export default function CreateGRNForm({ warehouses, allowPurchaseSelect, initialPurchase, initialTpn, userDefaultWarehouseId, isNormalUser }: CreateGRNFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [sourceType, setSourceType] = useState<"PURCHASE" | "TPN">(
    initialPurchase ? "PURCHASE" : initialTpn ? "TPN" : allowPurchaseSelect ? "PURCHASE" : "TPN"
  );
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(
    initialPurchase?.warehouseId || initialTpn?.destinationWarehouseId || userDefaultWarehouseId || ""
  );

  const [pendingPurchases, setPendingPurchases] = useState<any[]>([]);
  const [pendingTpns, setPendingTpns] = useState<any[]>([]);
  
  const [selectedDocument, setSelectedDocument] = useState<any>(initialPurchase || initialTpn || null);

  useEffect(() => {
    if (selectedWarehouseId && !initialPurchase && !initialTpn) {
      if (sourceType === "PURCHASE") {
        getPendingPurchasesForWarehouse(selectedWarehouseId).then(res => {
          if (res.success) setPendingPurchases(res.purchases || []);
        });
      } else {
        getPendingTPNsForWarehouse(selectedWarehouseId).then(res => {
          if (res.success) setPendingTpns(res.tpns || []);
        });
      }
    }
  }, [selectedWarehouseId, sourceType, initialPurchase, initialTpn]);

  const pendingItems = selectedDocument?.items?.filter(
    (item: any) => item.quantity > (item.receivedQuantity || 0)
  ) || [];

  const { register, control, handleSubmit, setValue, reset, formState: { errors } } = useForm<GRNFormData>({
    resolver: zodResolver(createGRNSchema) as any,
    defaultValues: {
      purchaseId: initialPurchase?.id || null,
      tpnId: initialTpn?.id || null,
      warehouseId: selectedWarehouseId,
      date: new Date(),
      notes: "",
      items: pendingItems.map((item: any) => ({
        purchaseItemId: sourceType === "PURCHASE" ? item.id : null,
        tpnItemId: sourceType === "TPN" ? item.id : null,
        receivedQuantity: item.quantity - (item.receivedQuantity || 0),
      })),
    },
  });

  const { fields } = useFieldArray({
    control,
    name: "items",
  });

  const handleDocumentSelect = (docId: string) => {
    let doc = null;
    if (sourceType === "PURCHASE") {
      doc = pendingPurchases.find(p => p.id === docId);
    } else {
      doc = pendingTpns.find(t => t.id === docId);
    }
    
    setSelectedDocument(doc);
    
    if (doc) {
      const pItems = doc.items.filter((item: any) => item.quantity > (item.receivedQuantity || 0));
      setValue("purchaseId", sourceType === "PURCHASE" ? doc.id : null);
      setValue("tpnId", sourceType === "TPN" ? doc.id : null);
      setValue("warehouseId", selectedWarehouseId);
      setValue("items", pItems.map((item: any) => ({
        purchaseItemId: sourceType === "PURCHASE" ? item.id : null,
        tpnItemId: sourceType === "TPN" ? item.id : null,
        receivedQuantity: item.quantity - (item.receivedQuantity || 0),
      })));
    }
  };

  const onSubmit = async (data: GRNFormData) => {
    try {
      setLoading(true);
      setError("");

      const result = await createGRN(data);
      if (!result.success || !result.grn) {
        throw new Error(result.error || "Failed to create GRN");
      }

      // Automatically confirm GRN after creating
      const confirmResult = await confirmGRN(result.grn.id);
      if (!confirmResult.success) {
        throw new Error(confirmResult.error || "Failed to confirm GRN");
      }

      router.push("/dashboard/procurements/grn");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const isLocked = !!initialPurchase || !!initialTpn;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Goods Receipt Note (GRN)</CardTitle>
        <CardDescription>
          Receive items from a Purchase Order or Transfer Purchase Note
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
              <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isLocked && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 border rounded-lg bg-muted/20">
              <div className="space-y-3">
                <Label>Source Type</Label>
                <RadioGroup 
                  value={sourceType} 
                  onValueChange={(val: any) => {
                    setSourceType(val);
                    setSelectedDocument(null);
                  }}
                  className="flex space-x-4"
                >
                  {allowPurchaseSelect && (
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PURCHASE" id="src-purchase" />
                      <Label htmlFor="src-purchase">Purchase</Label>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="TPN" id="src-tpn" />
                    <Label htmlFor="src-tpn">TPN</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Warehouse</Label>
                <Select disabled={!!isNormalUser} value={selectedWarehouseId} onValueChange={(val) => {
                  setSelectedWarehouseId(val);
                  setSelectedDocument(null);
                  setValue("warehouseId", val);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name} ({w.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Document</Label>
                <Select 
                  value={selectedDocument?.id || ""} 
                  onValueChange={handleDocumentSelect}
                  disabled={!selectedWarehouseId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${sourceType === "PURCHASE" ? "Purchase" : "TPN"}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceType === "PURCHASE" ? pendingPurchases.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.purchaseNumber}</SelectItem>
                    )) : pendingTpns.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.tpnNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {isLocked && selectedDocument && (
            <div className="p-4 border rounded-lg bg-muted/20 mb-6">
              <p className="text-sm font-medium">Receiving for {sourceType === "PURCHASE" ? "Purchase" : "TPN"}: {sourceType === "PURCHASE" ? selectedDocument.purchaseNumber : selectedDocument.tpnNumber}</p>
            </div>
          )}

          {selectedDocument && pendingItems.length === 0 ? (
            <div className="text-center py-6">
              <FiCheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium">Document Fully Received</h3>
              <p className="text-muted-foreground mt-2">All items for this document have been received.</p>
            </div>
          ) : selectedDocument ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Controller
                    name="date"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="date"
                        value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                        disabled={loading}
                      />
                    )}
                  />
                  {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea {...register("notes")} disabled={loading} rows={2} />
                  {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden mt-6">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-3 py-2">Item Description</th>
                      <th className="text-right px-3 py-2">Total Qty</th>
                      <th className="text-right px-3 py-2">Previously Received</th>
                      <th className="text-right px-3 py-2">Remaining</th>
                      <th className="text-right px-3 py-2 w-32">Receive Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => {
                      const item = pendingItems[index];
                      if (!item) return null;
                      
                      const received = item.receivedQuantity || 0;
                      const remaining = item.quantity - received;
                      
                      return (
                        <tr key={field.id} className="border-t">
                          <td className="px-3 py-2 align-middle">{item.item?.name} {item.variant?.name ? `- ${item.variant.name}` : ''}</td>
                          <td className="px-3 py-2 text-right align-middle">{item.quantity}</td>
                          <td className="px-3 py-2 text-right align-middle">{received}</td>
                          <td className="px-3 py-2 text-right align-middle">{remaining}</td>
                          <td className="px-3 py-2 text-right">
                            <Input
                              type="number"
                              step="any"
                              {...register(`items.${index}.receivedQuantity` as const, { valueAsNumber: true })}
                              disabled={loading}
                              max={remaining}
                              min={0}
                              className="text-right h-8"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {errors.items && <p className="text-sm text-destructive">{errors.items.message}</p>}

              <div className="flex justify-end pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => router.push("/dashboard/procurements/grn")} className="mr-2" disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
                  <FiSave className="mr-2 h-4 w-4" />
                  {loading ? "Confirming GRN..." : "Confirm Receipt"}
                </Button>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg">
              Please select a warehouse and document to receive items.
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
