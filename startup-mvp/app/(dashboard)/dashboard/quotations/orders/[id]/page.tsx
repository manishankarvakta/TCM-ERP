import { prisma } from "@/lib/prisma";
import { getOrderFinancialSummary } from "@/app/actions/orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiArrowLeft, FiPrinter } from "react-icons/fi";
import { formatDate, formatCurrency } from "@/lib/utils/formatters";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import FinancialSummaryCard from "../_components/financial-summary-card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DeliveryScheduleTab from "./_components/delivery-schedule-tab";
import InvoicesTab from "./_components/invoices-tab";

interface OrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;
  
  const session = await auth();
  const userId = session?.user?.id;
  
  // Permission Checks
  const canView = userId ? await hasPermission(userId, "quotations.orders", "view") : false;
  const canEditOrders = userId ? await hasPermission(userId, "quotations.orders", "edit") : false;
  const canCreateInvoices = userId ? await hasPermission(userId, "quotations.invoices", "create") : false;

  if (!canView) {
      return <div className="p-8 text-center text-destructive">Access Denied</div>;
  }

  // 1. Fetch Financial Summary
  const financialResult = await getOrderFinancialSummary(id);
  
  // 2. Fetch Detailed Order Data (items, client, reference)
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
        client: {
            select: {
                id: true,
                name: true,
                company: true,
                email: true,
                address: true,
                phone: true,
            }
        },
        quotation: {
            select: { id: true, quotationNumber: true }
        },
        items: {
            include: {
                deliveries: true,
                invoiceItems: true
            }
        },
        deliveries: {
            orderBy: { date: 'desc' },
            include: {
                orderItem: true,
                creator: {
                    select: { name: true, email: true }
                }
            }
        },
        invoices: {
            orderBy: { date: 'desc' }
        }
    }
  });

  if (!financialResult.success || !order) {
    notFound();
  }

  const { summary } = financialResult as any;

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending": return <Badge variant="secondary">Pending</Badge>;
      case "processing": return <Badge className="bg-blue-600">Processing</Badge>;
      case "delivered": return <Badge className="bg-indigo-600">Delivered</Badge>;
      case "completed": return <Badge className="bg-green-600">Completed</Badge>;
      case "cancelled": return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Serialize Decimal objects to plain numbers for Client Components
  const serializedOrder = {
    ...order,
    totalValue: Number(order.totalValue),
    items: order.items.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        amount: Number(item.amount),
        deliveries: item.deliveries.map(d => ({
            ...d,
            quantity: Number(d.quantity)
        })),
        invoiceItems: item.invoiceItems.map(i => ({
            ...i,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            amount: Number(i.amount)
        }))
    })),
    deliveries: order.deliveries.map(d => ({
        ...d,
        quantity: Number(d.quantity),
        orderItem: {
            ...d.orderItem,
            quantity: Number(d.orderItem.quantity),
            unitPrice: Number(d.orderItem.unitPrice),
            amount: Number(d.orderItem.amount)
        }
    })),
    invoices: order.invoices.map(i => ({
        ...i,
        totalAmount: Number(i.totalAmount)
    }))
  };

  return (
    <div className="min-h-screen space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/quotations/orders">
              <Button variant="outline" size="sm">
                <FiArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    {order.orderNumber}
                    {getStatusBadge(order.status)}
                </h1>
                <p className="text-sm text-muted-foreground mr-1">
                    Created on {formatDate(order.createdAt)} 
                    {order.quotation && (
                        <> • Ref: <Link href={`/dashboard/quotations/${order.quotation.id}`} className="text-primary hover:underline">{order.quotation.quotationNumber}</Link></>
                    )}
                </p>
            </div>
          </div>
          {/* Actions */}
          <Button variant="outline" disabled title="Coming soon">
            <FiPrinter className="mr-2 h-4 w-4" />
            Print Order
          </Button>
        </div>

        {/* Client & Financial Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Client Card */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Client Details</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                    <div className="font-semibold">{order.client?.company || order.client?.name}</div>
                    {order.client?.company && <div>{order.client.name}</div>}
                    <div>{order.client?.email}</div>
                    <div>{order.client?.phone}</div>
                    <div className="text-muted-foreground whitespace-pre-wrap">{order.client?.address}</div>
                </CardContent>
            </Card>

            {/* Financial Summary Card (Spans 2 cols) */}
            <div className="md:col-span-2">
                <FinancialSummaryCard summary={summary} />
            </div>
        </div>

        {/* Order Items */}
        <Card>
            <CardHeader>
                <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-muted-foreground border-b">
                            <tr>
                                <th className="text-left py-3 font-medium">Description</th>
                                <th className="text-left py-3 font-medium w-32">SKU</th>
                                <th className="text-right py-3 font-medium w-24">Ordered</th>
                                <th className="text-right py-3 font-medium w-24">Delivered</th>
                                <th className="text-right py-3 font-medium w-24">Invoiced</th>
                                <th className="text-right py-3 font-medium w-32">Unit Price</th>
                                <th className="text-right py-3 font-medium w-32">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {order.items.map((item) => {
                                const deliveredQty = item.deliveries.reduce((sum, d) => sum + Number(d.quantity), 0);
                                const invoicedQty = item.invoiceItems.reduce((sum, i) => sum + Number(i.quantity), 0);
                                const isFulfilled = deliveredQty >= Number(item.quantity);

                                return (
                                    <tr key={item.id} className="hover:bg-muted/30">
                                        <td className="py-3 pr-4">{item.description}</td>
                                        <td className="py-3 text-muted-foreground">{item.sku || '-'}</td>
                                        <td className="py-3 text-right font-medium">{Number(item.quantity)}</td>
                                        <td className={`py-3 text-right ${isFulfilled ? 'text-green-600' : 'text-blue-600'}`}>
                                            {deliveredQty}
                                        </td>
                                        <td className="py-3 text-right text-indigo-600">{invoicedQty}</td>
                                        <td className="py-3 text-right text-muted-foreground">{formatCurrency(Number(item.unitPrice))}</td>
                                        <td className="py-3 text-right font-medium">{formatCurrency(Number(item.quantity) * Number(item.unitPrice))}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={6} className="py-4 text-right font-semibold">Grand Total</td>
                                <td className="py-4 text-right font-bold text-lg">{formatCurrency(Number(order.totalValue))}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </CardContent>
        </Card>

        {/* Action Tabs */}
        <Tabs defaultValue="delivery-schedule" className="w-full">
            <TabsList>
                <TabsTrigger value="delivery-schedule">Delivery Schedule</TabsTrigger>
                <TabsTrigger value="invoices">Invoices</TabsTrigger>
            </TabsList>
            
            <TabsContent value="delivery-schedule" className="mt-4">
                <DeliveryScheduleTab order={serializedOrder} canEdit={canEditOrders} />
            </TabsContent>

            <TabsContent value="invoices" className="mt-4">
                <InvoicesTab order={serializedOrder} canCreate={canCreateInvoices} />
            </TabsContent>
        </Tabs>
    </div>
  );
}
