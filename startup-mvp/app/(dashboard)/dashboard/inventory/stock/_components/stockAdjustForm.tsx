"use client";

import { useState, useEffect } from "react";
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
import { FiAlertCircle, FiPackage, FiBox } from "react-icons/fi";
import { adjustStock, getStock, getActiveItems, getActiveWarehouses } from "../_actions/stock.action";

const stockAdjustSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  quantity: z.number().refine((val) => val !== 0, {
    message: "Quantity cannot be zero",
  }),
  notes: z.string().optional(),
});

type StockAdjustFormData = z.infer<typeof stockAdjustSchema>;

interface Item {
  id: string;
  name: string;
  code: string;
  trackInventory: boolean;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

export default function StockAdjustForm() {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [currentStock, setCurrentStock] = useState<{
    quantity: number;
    reservedQuantity: number;
    available: number;
  } | null>(null);
  const [loadingStock, setLoadingStock] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    watch,
  } = useForm<StockAdjustFormData>({
    resolver: zodResolver(stockAdjustSchema),
    defaultValues: {
      itemId: "",
      warehouseId: "",
      quantity: 0,
      notes: "",
    },
  });

  const watchedItemId = watch("itemId");
  const watchedWarehouseId = watch("warehouseId");

  // Fetch items and warehouses
  useEffect(() => {
    async function fetchData() {
      try {
        // Note: These functions need to be created in stock.action.tsx
        // For now, we'll fetch from existing actions
        const itemsResult = await getActiveItems();
        const warehousesResult = await getActiveWarehouses();

        if (itemsResult.success) {
          setItems(itemsResult.items || []);
        }
        if (warehousesResult.success) {
          setWarehouses(warehousesResult.warehouses || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }
    fetchData();
  }, []);

  // Fetch current stock when item and warehouse are selected
  useEffect(() => {
    if (watchedItemId && watchedWarehouseId) {
      setLoadingStock(true);
      getStock(watchedItemId, watchedWarehouseId)
        .then((result) => {
          if (result.success && result.stock) {
            const qty = Number(result.stock.quantity);
            const reserved = Number(result.stock.reservedQuantity);
            setCurrentStock({
              quantity: qty,
              reservedQuantity: reserved,
              available: qty - reserved,
            });
          } else {
            setCurrentStock({
              quantity: 0,
              reservedQuantity: 0,
              available: 0,
            });
          }
        })
        .catch((error) => {
          console.error("Error fetching stock:", error);
          setCurrentStock(null);
        })
        .finally(() => {
          setLoadingStock(false);
        });
    } else {
      setCurrentStock(null);
    }
  }, [watchedItemId, watchedWarehouseId]);

  const onSubmit = async (data: StockAdjustFormData) => {
    try {
      setLoading(true);
      setError("");

      const result = await adjustStock({
        itemId: data.itemId,
        warehouseId: data.warehouseId,
        quantity: data.quantity,
        notes: data.notes || "",
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to adjust stock");
      }

      router.push("/dashboard/inventory/stock");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedItem = items.find((item) => item.id === watchedItemId);
  const selectedWarehouse = warehouses.find((w) => w.id === watchedWarehouseId);

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>Stock Adjustment</CardTitle>
          <CardDescription>
            Adjust stock quantity for an item in a warehouse. Use positive values to increase stock, negative values to decrease.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                  <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="itemId">Item *</Label>
                  <Controller
                    name="itemId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={loading}
                      >
                        <SelectTrigger id="itemId">
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {items
                            .filter((item) => item.trackInventory)
                            .map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name} ({item.code})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.itemId && (
                    <p className="text-sm text-destructive">{errors.itemId.message}</p>
                  )}
                  {selectedItem && !selectedItem.trackInventory && (
                    <p className="text-sm text-muted-foreground">
                      This item does not track inventory
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="warehouseId">Warehouse *</Label>
                  <Controller
                    name="warehouseId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={loading}
                      >
                        <SelectTrigger id="warehouseId">
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
              </div>

              {/* Current Stock Display */}
              {currentStock !== null && watchedItemId && watchedWarehouseId && (
                <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Current Stock
                  </Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Quantity</p>
                      <p className="text-lg font-semibold">
                        {currentStock.quantity.toLocaleString("en-BD", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Reserved</p>
                      <p className="text-lg font-semibold text-muted-foreground">
                        {currentStock.reservedQuantity.toLocaleString("en-BD", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Available</p>
                      <p className="text-lg font-semibold text-green-600">
                        {currentStock.available.toLocaleString("en-BD", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="quantity">Adjustment Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="1"
                  placeholder="e.g., 10 (increase) or -5 (decrease)"
                  {...register("quantity", { valueAsNumber: true })}
                  disabled={loading || loadingStock}
                />
                {errors.quantity && (
                  <p className="text-sm text-destructive">{errors.quantity.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Enter positive value to increase stock, negative value to decrease stock
                </p>
                {currentStock !== null && watchedItemId && (
                  <p className="text-xs text-muted-foreground">
                    New quantity after adjustment:{" "}
                    <span className="font-semibold">
                      {(currentStock.quantity + (watch("quantity") || 0)).toLocaleString("en-BD", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Reason for adjustment..."
                  {...register("notes")}
                  disabled={loading}
                  rows={3}
                />
                {errors.notes && (
                  <p className="text-sm text-destructive">{errors.notes.message}</p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button type="submit" disabled={loading || loadingStock}>
                  {loading ? "Adjusting..." : "Adjust Stock"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
