"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FiAlertCircle, FiLoader } from "react-icons/fi";
import { createProductionOrder, updateProductionOrder, validateStockAvailability } from "../_actions/production.action";
import { getBOMById } from "../../boms/_actions/bom.action";
import { useToast } from "@/hooks/use-toast";

// Redux imports
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/lib/store";
import {
  setProductionData,
  setSelectedBOM,
  initializeProduction,
  resetProduction
} from "@/lib/redux/slices/productionSlice";

const productionFormSchema = z.object({
  bomId: z.string().min(1, "BOM is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  notes: z.string().optional().nullable(),
});

type ProductionFormData = z.infer<typeof productionFormSchema>;

interface BOM {
  id: string;
  code: string;
  name: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  unitSymbol: string;
  quantityPerUnit: number;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface ProductionFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    code: string;
    bomId: string;
    warehouseId: string;
    quantity: number;
    notes: string | null;
  };
  boms: BOM[];
  warehouses: Warehouse[];
}

export default function ProductionForm({
  mode,
  initialData,
  boms,
  warehouses,
}: ProductionFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetchingBOM, setFetchingBOM] = useState(false);
  
  // Redux hooks
  const dispatch = useDispatch<AppDispatch>();
  const productionState = useSelector((state: RootState) => state.production);
  
  const [stockValidation, setStockValidation] = useState<Array<{
    itemId: string;
    itemName: string;
    itemCode: string;
    required: number;
    available: number;
    isAvailable: boolean;
  }>>([]);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ProductionFormData>({
    resolver: zodResolver(productionFormSchema) as any,
    defaultValues: initialData
      ? {
          bomId: initialData.bomId,
          warehouseId: initialData.warehouseId,
          quantity: initialData.quantity,
          notes: initialData.notes || "",
        }
      : {
          bomId: "",
          warehouseId: "",
          quantity: 1,
          notes: "",
        },
  });

  const watchedBOMId = watch("bomId");
  const watchedQuantity = watch("quantity");
  const watchedWarehouseId = watch("warehouseId");
  const watchedNotes = watch("notes");

  // Initialize Redux state on mount
  useEffect(() => {
    const init = async () => {
      dispatch(resetProduction()); // Clear previous state first

      if (initialData) {
        setFetchingBOM(true);
        try {
          // Fetch full BOM details for the initial BOM
          const bomResult = await getBOMById(initialData.bomId);
          if (bomResult.success && bomResult.bom) {
            dispatch(initializeProduction({
              bomId: initialData.bomId,
              warehouseId: initialData.warehouseId,
              quantity: initialData.quantity,
              notes: initialData.notes || "",
              selectedBOM: {
                id: bomResult.bom.id,
                quantityPerUnit: bomResult.bom.quantityPerUnit,
                items: bomResult.bom.items.map(item => ({
                  itemId: item.item.id,
                  itemName: item.item.name,
                  itemCode: item.item.code,
                  unitSymbol: item.item.unit.symbol,
                  quantityRequired: item.quantityRequired,
                  costPrice: item.item.costPrice
                }))
              }
            }));
          }
        } catch (error) {
          console.error("Failed to initialize production data:", error);
        } finally {
          setFetchingBOM(false);
        }
      }
    };
    init();
    
    // Cleanup on unmount
    return () => {
      dispatch(resetProduction());
    };
  }, [dispatch, initialData]);

  // Handle BOM Selection Change
  useEffect(() => {
    const handleBOMChange = async () => {
      // Only fetch if BOM ID changed and it's not the initial load (which is handled above)
      // and not null/empty
      if (watchedBOMId && watchedBOMId !== productionState.bomId) {
        setFetchingBOM(true);
        try {
          const bomResult = await getBOMById(watchedBOMId);
          
          if (bomResult.success && bomResult.bom) {
             dispatch(setSelectedBOM({
                id: bomResult.bom.id,
                quantityPerUnit: bomResult.bom.quantityPerUnit,
                items: bomResult.bom.items.map(item => ({
                  itemId: item.item.id,
                  itemName: item.item.name,
                  itemCode: item.item.code,
                  unitSymbol: item.item.unit.symbol,
                  quantityRequired: item.quantityRequired,
                  costPrice: item.item.costPrice
                }))
             }));
             
             // Also update the bomId in state
             dispatch(setProductionData({ bomId: watchedBOMId }));
          } else {
             setError("Failed to fetch BOM details");
             dispatch(setSelectedBOM(null));
          }
        } catch (err) {
          console.error("Error fetching BOM:", err);
          setError("Error fetching BOM details");
        } finally {
          setFetchingBOM(false);
        }
      } else if (!watchedBOMId) {
        dispatch(setSelectedBOM(null));
        dispatch(setProductionData({ bomId: null }));
      }
    };

    handleBOMChange();
  }, [watchedBOMId, dispatch, productionState.bomId]);

  // Sync Form Data Changes to Redux (for quantity calculation)
  useEffect(() => {
    dispatch(setProductionData({
      quantity: Number(watchedQuantity) || 0,
      warehouseId: watchedWarehouseId || null,
      notes: watchedNotes || ""
    }));
  }, [watchedQuantity, watchedWarehouseId, watchedNotes, dispatch]);


  // Validate stock when materials or warehouse changes (Side Effect)
  useEffect(() => {
    // Check validation availability
    // Debounce this slightly to avoid excessive calls during rapid typing
    const timer = setTimeout(() => {
      if (productionState.materials.length > 0 && watchedWarehouseId) {
        validateStockAvailability(
          productionState.materials.map((m) => ({
            itemId: m.itemId,
            quantityNeeded: m.quantityNeeded,
          })),
          watchedWarehouseId
        )
          .then((result) => {
            if (result.success) {
              setStockValidation(result.results);
            }
          })
          .catch((err) => {
            console.error("Error validating stock:", err);
          });
      } else {
        setStockValidation([]);
      }
    }, 500); // 500ms debounce for stock validation (network call)

    return () => clearTimeout(timer);
  }, [productionState.materials, watchedWarehouseId]);

  const onSubmit = async (data: ProductionFormData) => {
    setError("");
    setLoading(true);

    try {
      let result;
      if (mode === "create") {
        result = await createProductionOrder(data);
      } else {
        if (!initialData) {
          setError("Initial data is required for edit mode");
          setLoading(false);
          return;
        }
        result = await updateProductionOrder(initialData.id, data);
      }

      if (result.success) {
        toast({
          title: "Success",
          description:
            mode === "create"
              ? "Production order created successfully"
              : "Production order updated successfully",
        });
        router.push("/dashboard/production/orders");
      } else {
        setError(result.error || "Failed to save production order");
        toast({
          title: "Error",
          description: result.error || "Failed to save production order",
          variant: "destructive",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const hasStockWarnings = stockValidation.some((v) => !v.isAvailable);
  const selectedBOMSummary = boms.find((b) => b.id === watchedBOMId);

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <FiAlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {hasStockWarnings && (
        <Alert>
          <FiAlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Stock Warning:</strong> Some raw materials have insufficient stock. You can
            still create the order, but you'll need to ensure stock is available before completing
            production.
          </AlertDescription>
        </Alert>
      )}
      <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* BOM Selection */}
        <div className="space-y-2">
          <Label htmlFor="bomId">Bill of Materials *</Label>
          <Controller
            name="bomId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  // Redux dispatch handled in useEffect
                }}
                disabled={mode === "edit" || loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select BOM" />
                </SelectTrigger>
                <SelectContent>
                  {boms.map((bom) => (
                    <SelectItem key={bom.id} value={bom.id}>
                      {bom.name} ({bom.code}) - {bom.itemName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.bomId && (
            <p className="text-sm text-destructive">{errors.bomId.message}</p>
          )}
          {selectedBOMSummary && (
            <p className="text-xs text-muted-foreground">
              Produces {selectedBOMSummary.quantityPerUnit} {selectedBOMSummary.unitSymbol} per unit
            </p>
          )}
        </div>

        {/* Warehouse Selection */}
        <div className="space-y-2">
          <Label htmlFor="warehouseId">Warehouse *</Label>
          <Controller
            name="warehouseId"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} ({warehouse.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.warehouseId && (
            <p className="text-sm text-destructive">{errors.warehouseId.message}</p>
          )}
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <Label htmlFor="quantity">Production Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            step="1"
            min="0.01"
            {...register("quantity")}
            disabled={loading}
          />
          {errors.quantity && (
            <p className="text-sm text-destructive">{errors.quantity.message}</p>
          )}
          {selectedBOMSummary && watchedQuantity > 0 && (
            <p className="text-xs text-muted-foreground">
              Will produce:{" "}
              {(selectedBOMSummary.quantityPerUnit * watchedQuantity).toFixed(2)}{" "}
              {selectedBOMSummary.unitSymbol} of {selectedBOMSummary.itemName}
            </p>
          )}
        </div>
      </div>
        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            {...register("notes")}
            placeholder="Optional notes about this production order"
            rows={3}
            disabled={loading}
          />
        </div>
      </div>

      {/* Raw Materials Breakdown */}
      {watchedBOMId && watchedQuantity > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Raw Materials Required</CardTitle>
            <CardDescription>
              Calculated based on BOM and production quantity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fetchingBOM ? (
              <div className="flex items-center justify-center py-8">
                <FiLoader className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading BOM details...</span>
              </div>
            ) : productionState.materials.length === 0 ? (
               // If no materials are found or BOM not fully loaded yet (but not fetching)
               // This can happen briefly if BOM details action failed or returned empty items
              <p className="text-sm text-muted-foreground text-center py-4">
                {selectedBOMSummary ? "No raw materials configured for this BOM." : "Select a BOM to see required materials"}
              </p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Raw Material</TableHead>
                        <TableHead className="text-right">Required per Unit</TableHead>
                        <TableHead className="text-right">Total Needed</TableHead>
                        <TableHead className="text-right">Available Stock</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productionState.materials.map((material) => {
                        const validation = stockValidation.find(
                          (v) => v.itemId === material.itemId
                        );
                        const isAvailable = validation?.isAvailable ?? false;
                        const available = validation?.available ?? 0;

                        return (
                          <TableRow key={material.itemId}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{material.itemName}</div>
                                <div className="text-xs text-muted-foreground font-mono">
                                  {material.itemCode}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {material.quantityRequired.toFixed(2)} {material.unitSymbol}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {material.quantityNeeded.toFixed(2)} {material.unitSymbol}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {watchedWarehouseId
                                ? `${available.toFixed(2)} ${material.unitSymbol}`
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {watchedWarehouseId ? (
                                <span
                                  className={
                                    isAvailable
                                      ? "text-green-600 font-medium"
                                      : "text-red-600 font-medium"
                                  }
                                >
                                  {isAvailable ? "✓ Available" : "✗ Insufficient"}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Estimated Raw Material Cost: </span>
                    <span className="font-semibold">
                      ৳{productionState.totalCost.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/production/orders")}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading || fetchingBOM}>
          {loading ? (
            <>
              <FiLoader className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : mode === "create" ? (
            "Create Production Order"
          ) : (
            "Update Production Order"
          )}
        </Button>
      </div>
    </form>
  );
}
