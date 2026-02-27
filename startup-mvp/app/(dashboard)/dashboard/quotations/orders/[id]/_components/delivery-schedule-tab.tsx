"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { postBulkDelivery } from "@/app/actions/deliveries";
import { createDeliverySchedule } from "@/app/actions/delivery-schedules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/formatters";
import { FiPlus, FiExternalLink, FiCalendar } from "react-icons/fi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OrderItem {
  id: string;
  description: string;
  quantity: number;
  DeliveryLedger: Array<{ quantity: number }>;
}

interface Delivery {
  id: string;
  date: Date;
  quantity: number;
  status: string;
  description?: string | null;
  createdBy: string;
  OrderItem: {
    description: string;
  };
}

interface DeliverySchedule {
  id: string;
  scheduledDate: Date;
  status: string;
  description: string | null;
  _count: {
    DeliveryScheduleItem: number;
  };
}

interface DeliveryScheduleTabProps {
  order: {
    id: string;
    OrderItem: OrderItem[];
    DeliveryLedger: Delivery[];
    DeliverySchedule: DeliverySchedule[];
  };
  canEdit: boolean;
}

export default function DeliveryScheduleTab({ order, canEdit }: DeliveryScheduleTabProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Bulk Form State
  const [deliveryQuantities, setDeliveryQuantities] = useState<Record<string, string>>({});
  const [deliveryDate, setDeliveryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>("");

  // Schedule Form State
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<string>(new Date(Date.now() + 86400000).toISOString().split('T')[0]); // Tomorrow
  const [scheduleQuantities, setScheduleQuantities] = useState<Record<string, string>>({});
  const [scheduleDescription, setScheduleDescription] = useState<string>("");

  const handleQtyChange = (itemId: string, val: string) => {
    setDeliveryQuantities(prev => ({ ...prev, [itemId]: val }));
  };

  const handleSetMax = (item: OrderItem) => {
    const delivered = item.DeliveryLedger.reduce((s, d) => s + Number(d.quantity), 0);
    const remaining = Number(item.quantity) - delivered;
    if (remaining > 0) {
      handleQtyChange(item.id, remaining.toString());
    }
  };

  const remainingQtyParams = (item: OrderItem) => {
    const delivered = item.DeliveryLedger.reduce((s, d) => s + Number(d.quantity), 0);
    const remaining = Math.max(0, Number(item.quantity) - delivered);
    return { delivered, remaining };
  }

  const handleSubmit = async () => {
    const itemsToDeliver: Array<{ orderItemId: string; quantity: number }> = [];
    let hasError = false;

    for (const [itemId, qtyStr] of Object.entries(deliveryQuantities)) {
        const qty = parseFloat(qtyStr);
        if (!isNaN(qty) && qty > 0) {
             const item = order.OrderItem.find(i => i.id === itemId);
             if (item) {
                 const { remaining } = remainingQtyParams(item);
                 if (qty > remaining) {
                     alert(`Quantity for "${item.description}" exceeds remaining (${remaining})`);
                     hasError = true;
                     break;
                 }
                 itemsToDeliver.push({ orderItemId: itemId, quantity: qty });
             }
        }
    }

    if (hasError) return;

    if (itemsToDeliver.length === 0) {
        toast({
          title: "Selection Empty",
          description: "Please enter a quantity for at least one item.",
          variant: "destructive",
        });
        return;
    }

    setLoading(true);
    try {
      const result = await postBulkDelivery({
        orderId: order.id,
        items: itemsToDeliver,
        date: new Date(deliveryDate),
        description: description || undefined,
      });

      if (result.success) {
        setOpen(false);
        setDeliveryQuantities({});
        setDescription("");
        toast({
          title: "Success",
          description: "Delivery recorded successfully",
        });
        router.refresh(); 
      } else {
        toast({
          title: "Error",
          description: "error" in result ? result.error : "Failed to record delivery",
          variant: "destructive",
        });
      }
    } catch (error) {
       toast({
         title: "Error",
         description: "An unexpected error occurred",
         variant: "destructive",
       });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    const itemsToSchedule: Array<{ orderItemId: string; quantity: number }> = [];
    let hasError = false;

    for (const [itemId, qtyStr] of Object.entries(scheduleQuantities)) {
        const qty = parseFloat(qtyStr);
        if (!isNaN(qty) && qty > 0) {
             const item = order.OrderItem.find(i => i.id === itemId);
             if (item) {
                 const { remaining } = remainingQtyParams(item);
                 if (qty > remaining) {
                     alert(`Quantity for "${item.description}" exceeds remaining (${remaining})`);
                     hasError = true;
                     break;
                 }
                 itemsToSchedule.push({ orderItemId: itemId, quantity: qty });
             }
        }
    }

    if (hasError) return;

    if (itemsToSchedule.length === 0) {
        alert("Please enter a quantity for at least one item.");
        return;
    }

    setLoading(true);
    try {
      const result = await createDeliverySchedule(order.id, {
        scheduledDate: new Date(scheduleDate),
        description: scheduleDescription || undefined,
        items: itemsToSchedule,
      });

      if (result.success) {
        setScheduleOpen(false);
        setScheduleQuantities({});
        setScheduleDescription("");
        toast({
          title: "Success",
          description: "Delivery schedule created successfully",
        });
        router.refresh(); 
      } else {
        toast({
          title: "Error",
          description: "error" in result ? result.error : "Failed to create schedule",
          variant: "destructive",
        });
      }
    } catch (error) {
       toast({
         title: "Error",
         description: "An unexpected error occurred",
         variant: "destructive",
       });
    } finally {
      setLoading(false);
    }
  };

  // Group deliveries by batch (Date + Description + Status)
  const groupedDeliveries = useMemo(() => {
     const groups: Record<string, Delivery[]> = {};
     order.DeliveryLedger.forEach(d => {
        // Create a key based on date (day), description, and status
        const dateKey = new Date(d.date).toISOString().split('T')[0];
        const key = `${dateKey}|${d.description || ''}|${d.status}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(d);
     });
     return groups;
  }, [order.DeliveryLedger]);

  return (
    <div className="space-y-6">
      {/* Active Schedules Section */}
      {order.DeliverySchedule && order.DeliverySchedule.length > 0 && (
        <Card className="border-blue-100 bg-blue-50/20">
          <CardHeader className="py-3 px-6 border-b border-blue-100/50">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-800 uppercase tracking-tight">
               <FiCalendar className="h-4 w-4" />
               Planned Fulfillment Schedules
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <table className="w-full text-xs">
                <thead>
                   <tr className="bg-blue-50/50 text-blue-700/70 border-b border-blue-100/50">
                      <th className="py-2 px-6 text-left font-bold w-[120px]">Date</th>
                      <th className="py-2 text-left font-bold w-[100px]">Status</th>
                      <th className="py-2 text-left font-bold">Instructions</th>
                      <th className="py-2 text-center font-bold w-[60px]">Items</th>
                      <th className="py-2 px-6 text-right font-bold w-[80px]">Action</th>
                   </tr>
                </thead>
                 <tbody className="divide-y divide-blue-100/30">
                   {order.DeliverySchedule.map((s) => (
                      <tr key={s.id} className="hover:bg-blue-50/50 transition-colors">
                         <td className="py-3 px-6 font-semibold text-blue-900">{formatDate(s.scheduledDate)}</td>
                         <td className="py-3">
                            <Badge variant="outline" className={`text-[10px] h-5 px-1.5 uppercase font-bold tracking-tight border-blue-200/50 ${
                                s.status === 'completed' ? 'bg-green-100 text-green-700' :
                                s.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                               {s.status}
                            </Badge>
                         </td>
                         <td className="py-3 text-blue-800/70 italic max-w-xs truncate" title={s.description || ""}>
                            {s.description || "-"}
                         </td>
                         <td className="py-3 text-center">
                            <span className="bg-blue-100/50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                               {s._count.DeliveryScheduleItem}
                            </span>
                         </td>
                         <td className="py-3 px-6 text-right">
                            <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100/50">
                               <Link href={`/dashboard/quotations/delivery-schedule/${s.id}`}>
                                  View Plan
                                  <FiExternalLink className="ml-1.5 h-3 w-3" />
                               </Link>
                            </Button>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </CardContent>
        </Card>
      )}

      {/* Existing Delivery History Card */}
      <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Delivery History</CardTitle>
        {canEdit && (
          <div className="flex gap-2">
            {/* <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <FiPlus className="mr-2 h-4 w-4" />
                  Add Delivery
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Record New Delivery</DialogTitle>
                  <DialogDescription>
                    Enter quantities for the items you are delivering today.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 px-1">
                     <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-muted/30 rounded-lg border">
                        <div className="space-y-2">
                            <Label htmlFor="date">Delivery Date</Label>
                            <Input 
                                id="date" 
                                type="date" 
                                value={deliveryDate}
                                onChange={(e) => setDeliveryDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ref">Reference / Note</Label>
                            <Input 
                                id="ref" 
                                placeholder="e.g. Challan #123, Vehicle #..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                     </div>

                     <div className="border rounded-md overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-muted-foreground">
                                <tr>
                                    <th className="text-left py-3 px-4 font-medium">Description</th>
                                    <th className="text-center py-3 px-2 font-medium w-20">Ordered</th>
                                    <th className="text-center py-3 px-2 font-medium w-20">Dlvd</th>
                                    <th className="text-center py-3 px-2 font-medium w-20">Rem</th>
                                    <th className="text-left py-3 px-4 font-medium w-48">To Deliver</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {order.OrderItem.map((item) => {
                                    const { delivered, remaining } = remainingQtyParams(item);
                                    const isFullyDelivered = remaining <= 0;
                                    const currentInput = deliveryQuantities[item.id] || "";

                                    return (
                                        <tr key={item.id} className={isFullyDelivered ? "bg-muted/30 opacity-70" : ""}>
                                            <td className="py-3 px-4">
                                                <div className="font-medium">{item.description}</div>
                                                {isFullyDelivered && <Badge variant="secondary" className="text-[10px] mt-1">Completed</Badge>}
                                            </td>
                                            <td className="py-3 px-2 text-center text-muted-foreground">{Number(item.quantity)}</td>
                                            <td className="py-3 px-2 text-center text-blue-600">{delivered}</td>
                                            <td className="py-3 px-2 text-center font-bold text-green-700">{remaining}</td>
                                            <td className="py-3 px-4">
                                                {!isFullyDelivered && (
                                                    <div className="flex items-center gap-2">
                                                        <Input 
                                                            type="number" 
                                                            className="w-24 h-9"
                                                            placeholder="0"
                                                            min="0"
                                                            max={remaining}
                                                            value={currentInput}
                                                            onChange={(e) => handleQtyChange(item.id, e.target.value)}
                                                        />
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-8 px-2 text-xs text-muted-foreground hover:text-primary"
                                                            onClick={() => handleSetMax(item)}
                                                            tabIndex={-1}
                                                        >
                                                            Max
                                                        </Button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                     </div>
                </div>

                <DialogFooter className="pt-2 border-t mt-auto">
                  <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Record Deliveries
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog> */}

            <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                  <FiCalendar className="mr-2 h-4 w-4" />
                  Schedule Delivery
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col border-blue-100">
                <DialogHeader>
                  <DialogTitle className="text-blue-700">Schedule Future Fulfillment</DialogTitle>
                  <DialogDescription>
                    Plan a future delivery event. This will NOT post to the ledger yet.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 px-1">
                     {/* Global Settings */}
                     <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                        <div className="space-y-2">
                            <Label htmlFor="scheduleDate">Planned Date</Label>
                            <Input 
                                id="scheduleDate" 
                                type="date" 
                                value={scheduleDate}
                                onChange={(e) => setScheduleDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="scheduleRef">Internal Instructions</Label>
                            <Input 
                                id="scheduleRef" 
                                placeholder="Team instructions, driver notes..."
                                value={scheduleDescription}
                                onChange={(e) => setScheduleDescription(e.target.value)}
                            />
                        </div>
                     </div>

                     {/* Items Table */}
                     <div className="border border-blue-100 rounded-md overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 text-blue-700">
                                <tr>
                                    <th className="text-left py-3 px-4 font-medium">Description</th>
                                    <th className="text-center py-3 px-2 font-medium w-20">Ordered</th>
                                    <th className="text-center py-3 px-2 font-medium w-20">Dlvd</th>
                                    <th className="text-center py-3 px-2 font-medium w-20">Rem</th>
                                    <th className="text-left py-3 px-4 font-medium w-48">To Plan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-50">
                                {order.OrderItem.map((item) => {
                                    const { delivered, remaining } = remainingQtyParams(item);
                                    const isFullyDelivered = remaining <= 0;
                                    const currentInput = scheduleQuantities[item.id] || "";

                                    return (
                                        <tr key={item.id} className={isFullyDelivered ? "bg-slate-50 opacity-70" : ""}>
                                            <td className="py-3 px-4">
                                                <div className="font-medium">{item.description}</div>
                                            </td>
                                            <td className="py-3 px-2 text-center text-muted-foreground">{Number(item.quantity)}</td>
                                            <td className="py-3 px-2 text-center text-blue-600">{delivered}</td>
                                            <td className="py-3 px-2 text-center font-bold text-green-700">{remaining}</td>
                                            <td className="py-3 px-4">
                                                {!isFullyDelivered && (
                                                    <div className="flex items-center gap-2">
                                                        <Input 
                                                            type="number" 
                                                            className="w-24 h-9 border-blue-100"
                                                            placeholder="0"
                                                            min="0"
                                                            max={remaining}
                                                            value={currentInput}
                                                            onChange={(e) => setScheduleQuantities(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                        />
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-8 px-2 text-xs text-blue-400 hover:text-blue-600"
                                                            onClick={() => setScheduleQuantities(prev => ({ ...prev, [item.id]: remaining.toString() }))}
                                                            tabIndex={-1}
                                                        >
                                                            Max
                                                        </Button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                     </div>
                </div>

                <DialogFooter className="pt-2 border-t mt-auto">
                  <Button variant="outline" onClick={() => setScheduleOpen(false)} disabled={loading}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateSchedule} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Schedule
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {Object.keys(groupedDeliveries).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No deliveries recorded</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-b">
              <tr>
                <th className="text-left py-2">Delivery Date</th>
                <th className="text-left py-2">Reference</th>
                <th className="text-left py-2">Items</th>
                <th className="text-right py-2 px-4">Total Qty</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Object.entries(groupedDeliveries).sort((a, b) => new Date(b[1][0].date).getTime() - new Date(a[1][0].date).getTime()).map(([key, deliveries]) => {
                 const first = deliveries[0];
                 const totalQty = deliveries.reduce((s, d) => s + Number(d.quantity), 0);
                 
                 return (
                <tr key={key}>
                  <td className="py-3 align-top">{formatDate(first.date)}</td>
                  <td className="py-3 align-top text-muted-foreground font-medium">
                      {first.description || "-"}
                  </td>
                   <td className="py-3 align-top">
                    <div className="flex flex-col gap-1">
                        {deliveries.map(d => (
                            <div key={d.id} className="text-xs flex justify-between gap-4 border-b border-dashed pb-1 last:border-0 last:pb-0">
                                <span className="text-foreground/90">{d.OrderItem.description}</span>
                                <span className="font-semibold text-nowrap">x {Number(d.quantity)}</span>
                            </div>
                        ))}
                    </div>
                  </td>
                  <td className="py-3 align-top text-right px-4 font-bold">{totalQty}</td>
                  <td className="py-3 align-top">
                    <Badge variant="outline" className="text-xs uppercase">
                      {first.status}
                    </Badge>
                  </td>
                </tr>
                 );
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
