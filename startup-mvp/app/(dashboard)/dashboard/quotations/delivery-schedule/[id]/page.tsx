
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatDate, formatCurrency } from "@/lib/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { FiArrowLeft, FiTruck, FiMapPin, FiPackage, FiCalendar, FiUser } from "react-icons/fi";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PrintableChallan from "../_components/printable-challan";
import ChallanPrintButton from "../_components/challan-print-button";

interface DeliveryDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DeliveryDetailPage({ params }: DeliveryDetailPageProps) {
  const { id } = await params;

  const session = await auth();
  const userId = session?.user?.id;
  const canView = userId ? await hasPermission(userId, "quotations.orders", "view") : false;

  if (!canView) {
      return <div className="p-8 text-center text-destructive">Access Denied</div>;
  }

  const delivery = await prisma.deliveryLedger.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          client: true,
          quotation: {
            include: {
                organization: true
            }
          }
        }
      },
      orderItem: {
        include: {
            quotationItem: {
                include: {
                    item: true
                }
            }
        }
      },
      creator: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  if (!delivery) {
    notFound();
  }

  return (
    <div className="min-h-screen space-y-8 pb-12">
      
      {/* Printable Challan (Hidden) */}
      <PrintableChallan 
         delivery={delivery} 
         organization={delivery.order.quotation?.organization}
       />

      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-4">
          <Link href="/dashboard/quotations/delivery-schedule">
             <Button variant="outline" size="sm" className="mt-1">
              <FiArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold">Delivery Details</h1>
                <Badge variant="outline" className="uppercase tracking-wide">{delivery.status}</Badge>
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">ID: {delivery.id}</span>
              <span>•</span>
              <span>Processed on {formatDate(delivery.date)}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
           <ChallanPrintButton />
        </div>
      </div>

       {/* At a Glance Grid */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
                <CardContent className="pt-6 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-700 rounded-full">
                        <FiTruck className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">Order Reference</p>
                        <Link href={`/dashboard/quotations/orders/${delivery.order.id}`} className="text-lg font-bold text-primary hover:underline block truncate" title={delivery.order.orderNumber}>
                             {delivery.order.orderNumber}
                        </Link>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardContent className="pt-6 flex items-center gap-4">
                     <div className="p-3 bg-green-100 text-green-700 rounded-full">
                        <FiCalendar className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">Delivery Date</p>
                        <p className="text-lg font-bold">{formatDate(delivery.date).split(',')[0]}</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6 flex items-center gap-4">
                     <div className="p-3 bg-amber-100 text-amber-700 rounded-full">
                        <FiPackage className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">Quantity Delivered</p>
                         <p className="text-lg font-bold">{Number(delivery.quantity)}</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                 <CardContent className="pt-6 flex items-center gap-4">
                     <div className="p-3 bg-green-100 text-green-700 rounded-full">
                         <span className="font-bold text-xl">৳</span>
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm text-muted-foreground font-medium">Total Value</p>
                         <p className="text-lg font-bold truncate">
                            {formatCurrency(Number(delivery.quantity) * Number(delivery.orderItem.unitPrice))}
                         </p>
                    </div>
                </CardContent>
            </Card>
       </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Main Info: Items & Notes */}
        <div className="md:col-span-2 space-y-6">
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FiPackage className="h-5 w-5 text-muted-foreground" />
                        Item Details
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 flex flex-col md:flex-row justify-between md:items-center gap-4 hover:border-primary/50 transition-colors">
                        <div>
                             <p className="text-sm text-muted-foreground mb-1">Item Description</p>
                             <h3 className="font-semibold text-xl leading-none">{delivery.orderItem.description}</h3>
                             {delivery.orderItem.quotationItem?.item?.code && <p className="text-sm text-muted-foreground mt-2 font-mono">SKU: {delivery.orderItem.quotationItem.item.code}</p>}
                             <p className="text-sm text-muted-foreground mt-2">
                                Unit Price: <span className="font-medium text-foreground">{formatCurrency(Number(delivery.orderItem.unitPrice))}</span>
                             </p>
                        </div>
                        <div className="text-left md:text-right">
                            <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                            <span className="text-3xl font-bold tabular-nums text-primary">{formatCurrency(Number(delivery.quantity) * Number(delivery.orderItem.unitPrice))}</span>
                            <p className="text-xs text-muted-foreground mt-1">
                                {Number(delivery.quantity)} Pcs x {formatCurrency(Number(delivery.orderItem.unitPrice))}
                            </p>
                        </div>
                    </div>

                    {delivery.description && (
                        <div className="mt-8">
                            <h4 className="font-medium text-sm text-muted-foreground mb-3 uppercase tracking-wider">Additional Notes</h4>
                            <div className="bg-muted/40 p-4 rounded-md border text-sm leading-relaxed whitespace-pre-wrap">
                                {delivery.description}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        {/* Sidebar: Client Info */}
         <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FiMapPin className="h-5 w-5 text-muted-foreground" />
                        Receiver / Ship To
                    </CardTitle>
                    <CardDescription>Client details for this delivery</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <div className="font-bold text-lg">{delivery.order.client?.company || delivery.order.client?.name}</div>
                        {delivery.order.client?.company && <div className="text-muted-foreground">{delivery.order.client?.name}</div>}
                    </div>
                    
                    <div className="space-y-3 pt-2 text-sm">
                        {delivery.order.client?.email && (
                            <div className="flex gap-3">
                                <span className="text-muted-foreground w-16">Email:</span>
                                <span className="font-medium truncate">{delivery.order.client?.email}</span>
                            </div>
                         )}
                         {delivery.order.client?.phone && (
                            <div className="flex gap-3">
                                <span className="text-muted-foreground w-16">Phone:</span>
                                <span className="font-medium">{delivery.order.client?.phone}</span>
                            </div>
                         )}
                         {delivery.order.client?.address && (
                             <div className="pt-2 border-t mt-2">
                                <p className="text-muted-foreground mb-1 text-xs uppercase font-bold">Shipping Address</p>
                                <p className="leading-relaxed">{delivery.order.client?.address}</p>
                             </div>
                         )}
                    </div>
                </CardContent>
            </Card>
         </div>
      </div>
    </div>
  );
}
