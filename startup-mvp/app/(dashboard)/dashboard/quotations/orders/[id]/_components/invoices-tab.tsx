"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInvoice, postInvoice } from "@/app/actions/invoices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/utils/formatters";
import { FiPlus, FiEye } from "react-icons/fi";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

interface OrderItem {
  id: string;
  description: string;
  quantity: number; // Ordered
  unitPrice: number;
  DeliveryLedger: Array<{ quantity: number }>;
  InvoiceItem: Array<{ quantity: number }>;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: Date;
  status: string;
  totalAmount: number;
}

interface InvoicesTabProps {
  order: {
    id: string;
    OrderItem: OrderItem[];
    Invoice: Invoice[];
  };
  canCreate: boolean;
}

export default function InvoicesTab({ order, canCreate }: InvoicesTabProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);
  const [pendingInvoiceNumber, setPendingInvoiceNumber] = useState<string>("");


  // Selection: Set of Item IDs. Quantity is always full billable.
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Helper to calculate billable stats
  const getItemStats = (item: OrderItem) => {
    const ordered = Number(item.quantity);
    const delivered = item.DeliveryLedger.reduce((sum, d) => sum + Number(d.quantity), 0);
    const invoiced = item.InvoiceItem.reduce((sum, i) => sum + Number(i.quantity), 0);
    const billable = Math.max(0, delivered - invoiced);
    return { ordered, delivered, invoiced, billable };
  };

  const billableItems = order.OrderItem.filter(item => getItemStats(item).billable > 0);
  const canCreateInvoice = billableItems.length > 0;

  const handleCheckboxChange = (itemId: string, checked: boolean) => {
    const newSet = new Set(selectedItemIds);
    if (checked) {
      newSet.add(itemId);
    } else {
      newSet.delete(itemId);
    }
    setSelectedItemIds(newSet);
  };

  const calculateTotal = () => {
      let total = 0;
      selectedItemIds.forEach(id => {
          const item = order.OrderItem.find(i => i.id === id);
          if (item) {
              const stats = getItemStats(item);
              total += stats.billable * Number(item.unitPrice);
          }
      });
      return total;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItemIds.size === 0) {
      alert("Please select at least one item to invoice");
      return;
    }

    setLoading(true);
    try {
      const itemsToInvoice = Array.from(selectedItemIds).map(itemId => {
          const item = order.OrderItem.find(i => i.id === itemId)!;
          const stats = getItemStats(item);
          return {
              orderItemId: itemId,
              quantity: stats.billable,
              unitPrice: Number(item.unitPrice)
          };
      });

      const result = await createInvoice({
        orderId: order.id,
        items: itemsToInvoice
      });

      if (result.success && result.invoiceId) {
        setCreateOpen(false);
        setSelectedItemIds(new Set());
        setPendingInvoiceId(result.invoiceId);
        // We might not have the invoice Number yet unless we return it, but generally we do.
        // Assuming createInvoice returns invoiceId. I should check if it returns number too.
        // If not, we just say "Draft Invoice Created".
        setPendingInvoiceNumber("Draft Invoice"); 
        
        // Open confirmation
        setPostOpen(true);
        router.refresh(); // Refresh to show it in the list (as draft)
      } else {
        alert(result.error || "Failed to create invoice");
      }
    } catch (error) {
      alert("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handlePostConfirm = async () => {
      if (!pendingInvoiceId) return;
      setLoading(true);
      try {
          const result = await postInvoice(pendingInvoiceId);
          if (result.success) {
              alert("Invoice posted successfully!");
              setPostOpen(false);
              setPendingInvoiceId(null);
              router.refresh();
          } else {
              alert(result.error || "Failed to post invoice");
          }
      } catch (error) {
          alert("An unexpected error occurred while posting");
      } finally {
          setLoading(false);
      }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Invoices</CardTitle>
        <div className="flex gap-2">
            {canCreate && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
                <Button size="sm" disabled={!canCreateInvoice}>
                <FiPlus className="mr-2 h-4 w-4" />
                Create Invoice
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                <DialogTitle>Create Invoice</DialogTitle>
                <DialogDescription>
                    Select delivered items to invoice. Quantities are automatically set to the remaining delivered balance.
                </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreateSubmit} className="space-y-4 py-4">
                {billableItems.length === 0 ? (
                    <p className="text-center text-muted-foreground">No items valid for invoicing (Delivery required first).</p>
                ) : (
                    <div className="border rounded-md max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                            <tr>
                                <th className="p-2 w-10"></th>
                                <th className="p-2 text-left">Item</th>
                                <th className="p-2 text-right">Delivered</th>
                                <th className="p-2 text-right">Invoiced</th>
                                <th className="p-2 text-right">Billable</th>
                                <th className="p-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {billableItems.map(item => {
                                const stats = getItemStats(item);
                                const isSelected = selectedItemIds.has(item.id);
                                
                                return (
                                    <tr key={item.id} className={isSelected ? "bg-muted/30" : ""}>
                                        <td className="p-2 text-center">
                                            <Checkbox 
                                                checked={isSelected}
                                                onCheckedChange={(c) => handleCheckboxChange(item.id, c as boolean)}
                                            />
                                        </td>
                                        <td className="p-2 max-w-[250px] truncate" title={item.description}>
                                            <div className="font-medium">{item.description}</div>
                                            <div className="text-xs text-muted-foreground">{formatCurrency(Number(item.unitPrice))} / unit</div>
                                        </td>
                                        <td className="p-2 text-right">{stats.delivered}</td>
                                        <td className="p-2 text-right">{stats.invoiced}</td>
                                        <td className="p-2 text-right font-medium text-green-600">
                                            {stats.billable}
                                        </td>
                                        <td className="p-2 text-right font-semibold">
                                            {isSelected ? formatCurrency(stats.billable * Number(item.unitPrice)) : "-"}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    </div>
                )}
                
                <div className="flex justify-end items-center gap-4 pt-4 border-t">
                    <div className="text-xl font-bold">
                        Total: {formatCurrency(calculateTotal())}
                    </div>
                </div>

                <DialogFooter className="mt-4">
                    <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={loading}>
                    Cancel
                    </Button>
                    <Button type="submit" disabled={loading || selectedItemIds.size === 0}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Draft & Continue
                    </Button>
                </DialogFooter>
                </form>
            </DialogContent>
            </Dialog>
            )}

            {/* Post Confirmation Dialog */}
            <Dialog open={postOpen} onOpenChange={setPostOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Post Invoice?</DialogTitle>
                        <DialogDescription>
                            The invoice has been created as a DRAFT. Posting it will create the accounting journal entries and recognize revenue. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPostOpen(false)}>
                            Keep as Draft
                        </Button>
                        <Button onClick={handlePostConfirm} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Post Invoice
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>

      </CardHeader>
      <CardContent>
        {order.Invoice.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No invoices generated</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-b">
              <tr>
                <th className="text-left py-2">Invoice #</th>
                <th className="text-left py-2">Date</th>
                <th className="text-left py-2">Status</th>
                <th className="text-right py-2">Amount</th>
                <th className="text-right py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {order.Invoice.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="py-3 font-medium">{invoice.invoiceNumber}</td>
                  <td className="py-3">{formatDate(invoice.date)}</td>
                  <td className="py-3">
                    <Badge variant={invoice.status === 'posted' ? 'default' : 'secondary'}>
                      {invoice.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-right">{formatCurrency(Number(invoice.totalAmount))}</td>
                  <td className="py-3 text-right">
                    <div className="flex justify-end gap-2">
                         {invoice.status === 'draft' && (
                             <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8"
                                onClick={() => {
                                    setPendingInvoiceId(invoice.id);
                                    setPendingInvoiceNumber(invoice.invoiceNumber);
                                    setPostOpen(true);
                                }}
                             >
                                 Post
                             </Button>
                         )}
                        <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                        <Link href={`/dashboard/quotations/invoices/${invoice.id}`}>
                            <FiEye className="h-4 w-4" />
                        </Link>
                        </Button>
                    </div>
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
