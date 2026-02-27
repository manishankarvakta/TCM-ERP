
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { formatDate, formatCurrency } from "@/lib/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { FiArrowLeft, FiPrinter, FiFileText, FiCalendar, FiUser, FiMapPin } from "react-icons/fi";
import { Separator } from "@/components/ui/separator";
import PrintableInvoice from "../_components/printable-invoice";
import InvoicePrintButton from "../_components/invoice-print-button";

interface InvoiceDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = await params;
  
  const session = await auth();
  const userId = session?.user?.id;
  
  const canView = userId ? await hasPermission(userId, "quotations.invoices", "view") : false;

  if (!canView) {
      return <div className="p-8 text-center text-destructive">Access Denied</div>;
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      Order: {
        include: {
          Client: true,
          Quotation: {
            include: {
                Organization: true
            }
          }
        }
      },
      InvoiceItem: {
        include: {
          OrderItem: true
        }
      }
    }
  });

  if (!invoice) {
    notFound();
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
        case 'draft': return <Badge variant="secondary" className="uppercase tracking-wide">Draft</Badge>;
        case 'posted': return <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 uppercase tracking-wide">Posted</Badge>;
        case 'paid': return <Badge className="bg-green-600 hover:bg-green-700 uppercase tracking-wide">Paid</Badge>;
        case 'cancelled': return <Badge variant="destructive" className="uppercase tracking-wide">Cancelled</Badge>;
        default: return <Badge variant="outline" className="uppercase tracking-wide">{status}</Badge>;
    }
  };

  // Serialize Decimal objects to plain numbers for Client Components
  const serializedInvoice = {
    ...invoice,
    totalAmount: Number(invoice.totalAmount),
    InvoiceItem: invoice.InvoiceItem.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      amount: Number(item.amount),
      OrderItem: {
        ...item.OrderItem,
        quantity: Number(item.OrderItem.quantity),
        unitPrice: Number(item.OrderItem.unitPrice),
        amount: Number(item.OrderItem.amount),
      },
    })),
  };

  return (
    <div className="min-h-screen space-y-8 pb-12">
      
      {/* Printable Invoice Component (Hidden on screen) */}
      <PrintableInvoice 
        invoice={serializedInvoice} 
        organization={invoice.Order.Quotation?.Organization} 
      />

      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-4">
          <Link href="/dashboard/quotations/invoices">
            <Button variant="outline" size="sm" className="mt-1">
              <FiArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold">Invoice {invoice.invoiceNumber}</h1>
                {getStatusBadge(invoice.status)}
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">ID: {invoice.id}</span>
              <span>•</span>
              <span>Issued on {formatDate(invoice.date)}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
            <InvoicePrintButton />
        </div>
      </div>

       {/* At a Glance Grid */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
                <CardContent className="pt-6 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-700 rounded-full">
                        <span className="font-bold text-xl">৳</span>
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm text-muted-foreground font-medium">Total Amount</p>
                         <p className="text-lg font-bold truncate text-primary">
                            {formatCurrency(Number(invoice.totalAmount))}
                         </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6 flex items-center gap-4">
                     <div className="p-3 bg-green-100 text-green-700 rounded-full">
                        <FiFileText className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">Order Reference</p>
                        <Link href={`/dashboard/quotations/orders/${invoice.Order.id}`} className="text-lg font-bold text-primary hover:underline block truncate" title={invoice.Order.orderNumber}>
                             {invoice.Order.orderNumber}
                        </Link>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6 flex items-center gap-4">
                     <div className="p-3 bg-amber-100 text-amber-700 rounded-full">
                        <FiCalendar className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">Invoice Date</p>
                        <p className="text-lg font-bold">{formatDate(invoice.date).split(',')[0]}</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                 <CardContent className="pt-6 flex items-center gap-4">
                     <div className="p-3 bg-indigo-100 text-indigo-700 rounded-full">
                        <FiUser className="w-6 h-6" />
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm text-muted-foreground font-medium">Client</p>
                         <p className="text-lg font-bold truncate">
                            {invoice.Order.Client.company || invoice.Order.Client.name}
                         </p>
                    </div>
                </CardContent>
            </Card>
       </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Main Info: Items */}
        <div className="md:col-span-2 space-y-6">
            <Card className="h-full ">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FiFileText className="h-5 w-5 text-muted-foreground" />
                        Invoice Items
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="text-left py-3 px-6 font-semibold text-muted-foreground">Description</th>
                                    <th className="text-right py-3 px-6 font-semibold text-muted-foreground w-32">Qty</th>
                                    <th className="text-right py-3 px-6 font-semibold text-muted-foreground w-32">Unit Price</th>
                                    <th className="text-right py-3 px-6 font-semibold text-muted-foreground w-40">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {invoice.InvoiceItem.map((item) => (
                                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="py-4 px-6 font-medium text-foreground">{item.OrderItem.description}</td>
                                        <td className="py-4 px-6 text-right tabular-nums">{Number(item.quantity)}</td>
                                        <td className="py-4 px-6 text-right tabular-nums text-muted-foreground">{formatCurrency(Number(item.unitPrice))}</td>
                                        <td className="py-4 px-6 text-right font-medium tabular-nums">{formatCurrency(Number(item.amount))}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-muted/10 border-t">
                                <tr>
                                    <td colSpan={3} className="py-4 px-6 text-right font-semibold text-muted-foreground uppercase tracking-wider text-xs">Total Amount</td>
                                    <td className="py-4 px-6 text-right font-bold text-xl text-primary">{formatCurrency(Number(invoice.totalAmount))}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Sidebar: Client & Meta Info */}
         <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FiMapPin className="h-5 w-5 text-muted-foreground" />
                        Bill To
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <div className="font-bold text-lg">{invoice.Order.Client.company || invoice.Order.Client.name}</div>
                        {invoice.Order.Client.company && <div className="text-muted-foreground">{invoice.Order.Client.name}</div>}
                    </div>
                    
                    <div className="space-y-3 pt-2 text-sm">
                        {invoice.Order.Client.email && (
                            <div className="flex gap-3">
                                <span className="text-muted-foreground w-16">Email:</span>
                                <span className="font-medium truncate">{invoice.Order.Client.email}</span>
                            </div>
                         )}
                         {invoice.Order.Client.phone && (
                            <div className="flex gap-3">
                                <span className="text-muted-foreground w-16">Phone:</span>
                                <span className="font-medium">{invoice.Order.Client.phone}</span>
                            </div>
                         )}
                         {invoice.Order.Client.address && (
                             <div className="pt-2 border-t mt-2">
                                <p className="text-muted-foreground mb-1 text-xs uppercase font-bold">Billing Address</p>
                                <p className="leading-relaxed whitespace-pre-wrap">{invoice.Order.Client.address}</p>
                             </div>
                         )}
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="text-base">Related Documents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                     <div className="flex justify-between items-center bg-muted/30 p-2 rounded">
                        <span className="text-muted-foreground">Order Ref</span>
                        <Link href={`/dashboard/quotations/orders/${invoice.Order.id}`} className="font-medium text-primary hover:underline">
                            {invoice.Order.orderNumber}
                        </Link>
                    </div>
                    {invoice.Order.Quotation && (
                        <div className="flex justify-between items-center bg-muted/30 p-2 rounded">
                            <span className="text-muted-foreground">Quotation</span>
                            <Link href={`/dashboard/quotations/${invoice.Order.Quotation.id}`} className="font-medium text-primary hover:underline">
                                 {invoice.Order.Quotation.quotationNumber}
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>
         </div>
      </div>
    </div>
  );
}
