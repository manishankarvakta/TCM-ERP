// Refresh trigger - prisma synchronization
import { prisma } from "@/lib/prisma";
import { getOrderFinancialSummary } from "@/app/actions/orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiArrowLeft, FiPrinter, FiUser, FiCalendar, FiFileText, FiBox, FiMapPin } from "react-icons/fi";
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
import { serializeData } from "@/lib/utils/serialization";

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
        },
        deliverySchedules: {
            orderBy: { scheduledDate: 'desc' },
            include: {
                _count: {
                    select: { items: true }
                }
            }
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

  const serializedOrder = serializeData(order as any);

  return (
    <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{order.orderNumber}</h1>
              {getStatusBadge(order.status)}
            </div>
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
               <FiCalendar className="h-4 w-4" />
               Created on {formatDate(order.createdAt)}
               {order.quotation && (
                   <>
                     <span className="text-gray-300">|</span>
                     <FiFileText className="h-4 w-4" />
                     Ref: <Link href={`/dashboard/quotations/${order.quotation.id}`} className="text-primary hover:underline font-medium">{order.quotation.quotationNumber}</Link>
                   </>
               )}
            </p>
          </div>
          <div className="flex gap-2">
             <Link href="/dashboard/quotations/orders">
               <Button variant="outline">
                 <FiArrowLeft className="mr-2 h-4 w-4" />
                 Back to Orders
               </Button>
             </Link>
             <Button variant="outline" disabled title="Coming soon">
                 <FiPrinter className="mr-2 h-4 w-4" />
                 Print Order
             </Button>
          </div>
        </div>

        {/* At a Glance Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
                <CardContent className="p-4 flex flex-col justify-between h-full">
                    <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                    <div className="text-2xl font-bold mt-1 text-primary">{formatCurrency(Number(order.totalValue))}</div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4 flex flex-col justify-between h-full">
                    <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                    <div className="text-2xl font-bold mt-1">{order.items.length}</div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4 flex flex-col justify-between h-full">
                    <p className="text-sm font-medium text-muted-foreground">Fulfillment Status</p>
                     <div className="text-2xl font-bold mt-1 flex items-center gap-2">
                        {order.status === 'COMPLETED' ? (
                             <span className="text-green-600">Fulfilled</span>
                        ) : order.status === 'DELIVERED' ? (
                             <span className="text-indigo-600">Delivered</span>
                        ) : (
                             <span>In Progress</span>
                        )}
                     </div>
                </CardContent>
            </Card>
             <Card>
                <CardContent className="p-4 flex flex-col justify-between h-full hover:bg-muted/50 transition-colors cursor-pointer group">
                     <Link href={`/dashboard/contacts/clients/${order.client.id}`}>
                        <div className="flex justify-between items-start">
                             <p className="text-sm font-medium text-muted-foreground">Client</p>
                             <FiUser className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                        </div>
                        <div className="text-lg font-bold mt-1 truncate" title={order.client.company || order.client.name || ""}>
                            {order.client.company || order.client.name}
                        </div>
                     </Link>
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Line Items & Tabs */}
            <div className="md:col-span-2 space-y-6">
                <Card className="overflow-hidden">
                    <CardHeader className="bg-muted/30 pb-4 border-b">
                        <div className="flex items-center gap-2">
                            <FiBox className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>Order Items</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                         <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/30 text-muted-foreground">
                                    <tr>
                                        <th className="text-left py-3 px-4 font-medium">Description</th>
                                        <th className="text-right py-3 px-4 font-medium w-24">Ordered</th>
                                        <th className="text-right py-3 px-4 font-medium w-24">Dlvd</th>
                                        <th className="text-right py-3 px-4 font-medium w-24">Inv</th>
                                        <th className="text-right py-3 px-4 font-medium w-32">Unit Price</th>
                                        <th className="text-right py-3 px-4 font-medium w-32">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {order.items.map((item) => {
                                        const deliveredQty = item.deliveries.reduce((sum, d) => sum + Number(d.quantity), 0);
                                        const invoicedQty = item.invoiceItems.reduce((sum, i) => sum + Number(i.quantity), 0);
                                        const isFulfilled = deliveredQty >= Number(item.quantity);

                                        return (
                                            <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="font-medium">{item.description}</div>
                                                </td>
                                                <td className="py-3 px-4 text-right font-medium">{Number(item.quantity)}</td>
                                                <td className={`py-3 px-4 text-right ${isFulfilled ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                                                    {deliveredQty}
                                                </td>
                                                <td className="py-3 px-4 text-right text-indigo-600">{invoicedQty}</td>
                                                <td className="py-3 px-4 text-right text-muted-foreground">{formatCurrency(Number(item.unitPrice))}</td>
                                                <td className="py-3 px-4 text-right font-medium">{formatCurrency(Number(item.quantity) * Number(item.unitPrice))}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-muted/10 border-t">
                                    <tr>
                                        <td colSpan={5} className="py-4 px-4 text-right font-semibold text-muted-foreground">Grand Total</td>
                                        <td className="py-4 px-4 text-right font-bold text-lg text-primary">{formatCurrency(Number(order.totalValue))}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Delivery & Invoices Tabs */}
                <Tabs defaultValue="delivery-schedule" className="w-full">
                    <div className="flex items-center justify-between mb-2">
                        <TabsList>
                            <TabsTrigger value="delivery-schedule">Delivery Schedule</TabsTrigger>
                            <TabsTrigger value="invoices">Invoices</TabsTrigger>
                        </TabsList>
                    </div>
                    
                    <TabsContent value="delivery-schedule" className="mt-0">
                         <Card>
                            <CardHeader className="py-4 px-6 border-b bg-muted/30">
                                <CardTitle className="text-base font-medium">Delivery History</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <DeliveryScheduleTab order={serializedOrder} canEdit={canEditOrders} />
                            </CardContent>
                         </Card>
                    </TabsContent>

                    <TabsContent value="invoices" className="mt-0">
                         <Card>
                             <CardHeader className="py-4 px-6 border-b bg-muted/30">
                                <CardTitle className="text-base font-medium">Associated Invoices</CardTitle>
                             </CardHeader>
                             <CardContent className="p-0">
                                 <InvoicesTab order={serializedOrder} canCreate={canCreateInvoices} />
                             </CardContent>
                         </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Right Sidebar */}
             <div className="md:col-span-1 space-y-6">
                {/* Client Details Card */}
                <Card>
                    <CardHeader className="bg-muted/30 py-3 border-b">
                         <h3 className="font-semibold text-sm flex items-center gap-2">
                             <FiUser className="h-4 w-4" />
                             Client Information
                         </h3>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        <div>
                             <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Bill To</p>
                             <div className="font-semibold text-base">{order.client?.company || order.client?.name}</div>
                             {order.client?.company && <div className="text-sm text-muted-foreground">{order.client.name}</div>}
                        </div>
                        <Separator />
                        <div className="space-y-2 text-sm">
                            {order.client?.email && (
                                <div className="flex items-center gap-2">
                                     <span className="text-muted-foreground w-4 text-center">@</span>
                                     <a href={`mailto:${order.client.email}`} className="hover:underline text-primary">{order.client.email}</a>
                                </div>
                            )}
                             {order.client?.phone && (
                                <div className="flex items-center gap-2">
                                     <span className="text-muted-foreground w-4 text-center">#</span>
                                     <span>{order.client.phone}</span>
                                </div>
                            )}
                             {order.client?.address && (
                                <div className="flex items-start gap-2 mt-2">
                                    <FiMapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                    <span className="whitespace-pre-wrap text-muted-foreground">{order.client.address}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Financial Summary */}
                <FinancialSummaryCard summary={summary} />
             </div>
        </div>
    </div>
  );
}
