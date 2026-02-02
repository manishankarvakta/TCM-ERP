
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postDelivery } from "@/app/actions/deliveries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/formatters";
import { FiPlus } from "react-icons/fi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface OrderItem {
  id: string;
  description: string;
  quantity: number;
  deliveries: Array<{ quantity: number }>;
}

interface Delivery {
  id: string;
  date: Date;
  quantity: number;
  status: string;
  description?: string | null;
  createdBy: string;
  orderItem: {
    description: string;
  };
}

interface DeliveryScheduleTabProps {
  order: {
    id: string;
    items: OrderItem[];
    deliveries: Delivery[];
  };
  canEdit: boolean;
}

export default function DeliveryScheduleTab({ order, canEdit }: DeliveryScheduleTabProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);


  // Form State
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [deliveryQty, setDeliveryQty] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Derived State for Validation
  const selectedItem = order.items.find((i) => i.id === selectedItemId);
  const orderedQty = selectedItem ? Number(selectedItem.quantity) : 0;
  const deliveredSoFar = selectedItem
    ? selectedItem.deliveries.reduce((sum, d) => sum + Number(d.quantity), 0)
    : 0;
  const remainingQty = Math.max(0, orderedQty - deliveredSoFar);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      alert("Please select an item");
      return;
    }
    const qty = parseFloat(deliveryQty);
    if (isNaN(qty) || qty <= 0) {
      alert("Please enter a valid quantity");
      return;
    }
    if (qty > remainingQty) {
      alert(`Quantity cannot exceed remaining (${remainingQty})`);
      return;
    }

    setLoading(true);
    try {
      const result = await postDelivery({
        orderId: order.id,
        orderItemId: selectedItemId,
        quantity: qty,
        description: description || undefined,
        // Assuming user ID is handled securely on server via auth() as per action definition
      });

      if (result.success) {
        alert("Delivery recorded successfully");
        setOpen(false);
        // Reset form
        setSelectedItemId("");
        setDeliveryQty("");
        setDescription("");
        router.refresh(); // Refresh server data
      } else {
        alert(result.error || "Failed to record delivery");
      }
    } catch (error) {
      alert("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Delivery History</CardTitle>
        {canEdit && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <FiPlus className="mr-2 h-4 w-4" />
              Add Delivery
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Record New Delivery</DialogTitle>
              <DialogDescription>
                Select an item from the order and enter the quantity delivered.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Order Item</Label>
                <Select
                  value={selectedItemId}
                  onValueChange={(val) => {
                    setSelectedItemId(val);
                    setDeliveryQty(""); // Reset qty on item change to prevent accidental over-delivery
                  }}
                >
                  <SelectTrigger disabled={loading}>
                    <SelectValue placeholder="Select item to deliver..." />
                  </SelectTrigger>
                  <SelectContent>
                    {order.items.map((item) => {
                       const itemDelivered = item.deliveries.reduce((s, d) => s + Number(d.quantity), 0);
                       const itemRemaining = Number(item.quantity) - itemDelivered;
                       // Only show items that are not fully delivered, or show all with status?
                       // Showing all for transparency, but maybe disable full ones?
                       // Let's keep it simple: allow selection, validation handles logic.
                       return (
                        <SelectItem key={item.id} value={item.id} disabled={itemRemaining <= 0}>
                            {item.description} (Rem: {itemRemaining})
                        </SelectItem>
                       );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedItem && (
                <div className="grid grid-cols-3 gap-2 text-center text-sm p-3 bg-muted/50 rounded-md">
                   <div>
                        <div className="text-muted-foreground text-xs">Ordered</div>
                        <div className="font-semibold">{orderedQty}</div>
                   </div>
                   <div>
                        <div className="text-blue-600 text-xs">Delivered</div>
                        <div className="font-semibold text-blue-700">{deliveredSoFar}</div>
                   </div>
                   <div>
                        <div className="text-green-600 text-xs">Remaining</div>
                        <div className="font-semibold text-green-700">{remainingQty}</div>
                   </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="qty">Delivered Qty</Label>
                    <Input
                        id="qty"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={deliveryQty}
                        onChange={(e) => setDeliveryQty(e.target.value)}
                        disabled={!selectedItemId || loading}
                        max={remainingQty}
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="ref">Reference / Note</Label>
                    <Input
                        id="ref"
                        placeholder="e.g. Challan #123"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={loading}
                    />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !selectedItemId || !deliveryQty}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Post Delivery
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {order.deliveries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No deliveries recorded</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-b">
              <tr>
                <th className="text-left py-2">Delivery Date</th>
                <th className="text-left py-2">Reference</th>
                <th className="text-right py-2 px-4">Delivered Qty</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {order.deliveries.map((delivery) => (
                <tr key={delivery.id}>
                  <td className="py-3">{formatDate(delivery.date)}</td>
                  <td className="py-3 text-muted-foreground">
                    <div className="flex flex-col">
                        <span className="font-medium text-foreground">{delivery.description || "-"}</span>
                        <span className="text-xs">{delivery.orderItem.description}</span>
                    </div>
                  </td>
                  <td className="py-3 text-right px-4 font-medium">{Number(delivery.quantity)}</td>
                  <td className="py-3">
                    <Badge variant="outline" className="text-xs uppercase">
                      {delivery.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
