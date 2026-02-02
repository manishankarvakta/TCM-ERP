
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { formatDate, formatCurrency } from "@/lib/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { FiArrowLeft, FiPrinter } from "react-icons/fi";
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
      items: {
        include: {
          orderItem: true
        }
      }
    }
  });

  if (!invoice) {
    notFound();
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
        case 'draft': return <Badge variant="secondary">Draft</Badge>;
        case 'posted': return <Badge>Posted</Badge>;
        case 'paid': return <Badge className="bg-green-600">Paid</Badge>;
        case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen space-y-6">
      
      {/* Printable Invoice Component (Hidden on screen) */}
      <PrintableInvoice 
        invoice={invoice} 
        organization={invoice.order.quotation?.organization} 
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/quotations/invoices">
            <Button variant="outline" size="sm">
              <FiArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              {invoice.invoiceNumber}
              {getStatusBadge(invoice.status)}
            </h1>
            <p className="text-sm text-muted-foreground mr-1">
              Issued on {formatDate(invoice.date)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
            <InvoicePrintButton />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Client Details */}
        <Card className="md:col-span-2">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">Bill To</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
                <div className="font-semibold text-base">{invoice.order.client.company || invoice.order.client.name}</div>
                {invoice.order.client.company && <div>{invoice.order.client.name}</div>}
                <div>{invoice.order.client.email}</div>
                <div>{invoice.order.client.phone}</div>
                <div className="whitespace-pre-wrap text-muted-foreground">{invoice.order.client.address}</div>
            </CardContent>
        </Card>

        {/* Invoice Summary */}
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Order Ref:</span>
                    <Link href={`/dashboard/quotations/orders/${invoice.order.id}`} className="text-primary hover:underline">
                        {invoice.order.orderNumber}
                    </Link>
                </div>
                {invoice.order.quotation && (
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Quotation Ref:</span>
                        <Link href={`/dashboard/quotations/${invoice.order.quotation.id}`} className="text-primary hover:underline">
                             {invoice.order.quotation.quotationNumber}
                        </Link>
                    </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(Number(invoice.totalAmount))}</span>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Invoice Items */}
      <Card>
        <CardHeader>
            <CardTitle>Invoice Items</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-muted-foreground border-b">
                        <tr>
                            <th className="text-left py-3 font-medium">Description</th>
                            <th className="text-right py-3 font-medium w-32">Quantity</th>
                            <th className="text-right py-3 font-medium w-32">Unit Price</th>
                            <th className="text-right py-3 font-medium w-32">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {invoice.items.map((item) => (
                            <tr key={item.id}>
                                <td className="py-3">{item.orderItem.description}</td>
                                <td className="py-3 text-right">{Number(item.quantity)}</td>
                                <td className="py-3 text-right">{formatCurrency(Number(item.unitPrice))}</td>
                                <td className="py-3 text-right font-medium">{formatCurrency(Number(item.amount))}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={3} className="py-4 text-right font-semibold">Grand Total</td>
                            <td className="py-4 text-right font-bold text-lg">{formatCurrency(Number(invoice.totalAmount))}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
