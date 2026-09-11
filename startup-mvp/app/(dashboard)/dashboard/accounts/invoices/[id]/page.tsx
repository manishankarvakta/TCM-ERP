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
import PrintableInvoice from "@/app/(dashboard)/dashboard/quotations/invoices/_components/printable-invoice";
import InvoicePrintButton from "@/app/(dashboard)/dashboard/quotations/invoices/_components/invoice-print-button";
import PageGuard from "@/components/permissions/page-guard";

interface InvoiceDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AccountsInvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = await params;
  
  const session = await auth();
  const userId = session?.user?.id;
  
  const canView = userId
    ? (await hasPermission(userId, "accounts.vouchers", "view") ||
       await hasPermission(userId, "quotations.invoices", "view") ||
       await hasPermission(userId, "accounts.accounts-receivable", "view"))
    : false;

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
      case 'PAID':
        return <Badge className="bg-emerald-600">Paid</Badge>;
      case 'PARTIALLY_PAID':
        return <Badge variant="outline" className="border-emerald-600 text-emerald-600">Partially Paid</Badge>;
      case 'UNPAID':
        return <Badge variant="secondary">Unpaid</Badge>;
      case 'OVERDUE':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const client = invoice.Order?.Client;
  const org = invoice.Order?.Quotation?.Organization;
  const totalAmount = Number(invoice.totalAmount || 0);
  const isPaid = invoice.status === "PAID" || invoice.status === "paid";
  const paidAmount = isPaid ? totalAmount : 0;
  const dueAmount = isPaid ? 0 : totalAmount;

  return (
    <PageGuard permissionKey="accounts.vouchers">
      <div className="space-y-6">
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/accounts/invoices">
              <Button variant="outline" size="icon">
                <FiArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{invoice.invoiceNumber}</h1>
                {getStatusBadge(invoice.status)}
              </div>
              <p className="text-sm text-muted-foreground">
                Issued on {formatDate(invoice.date)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <InvoicePrintButton />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
          <Card className="md:col-span-2">
            <CardHeader className="border-b pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold">{org?.name || "Ferrari Fashion ERP"}</h2>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{org?.address || ""}</p>
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-semibold text-primary">INVOICE</h3>
                  <p className="text-sm font-mono">{invoice.invoiceNumber}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-muted-foreground mb-1">Billed To:</h4>
                  <p className="font-medium text-base">{client?.name || "N/A"}</p>
                  {client?.company && <p className="text-muted-foreground">{client.company}</p>}
                  {client?.email && <p className="text-muted-foreground">{client.email}</p>}
                  {client?.phone && <p className="text-muted-foreground">{client.phone}</p>}
                </div>
                <div className="text-right space-y-1">
                  <div>
                    <span className="text-muted-foreground">Invoice Date: </span>
                    <span className="font-medium">{formatDate(invoice.date)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Due Date: </span>
                    <span className="font-medium">{formatDate(invoice.date)}</span>
                  </div>
                  {invoice.Order?.orderNumber && (
                    <div>
                      <span className="text-muted-foreground">Order Ref: </span>
                      <Link href={`/dashboard/quotations/orders/${invoice.Order.id}`} className="font-mono text-primary hover:underline">
                        {invoice.Order.orderNumber}
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-left">
                      <th className="py-2">Item Description</th>
                      <th className="py-2 text-right">Qty</th>
                      <th className="py-2 text-right">Unit Price</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.InvoiceItem.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-3">{item.OrderItem?.description || "Invoice Line Item"}</td>
                        <td className="py-3 text-right">{item.quantity}</td>
                        <td className="py-3 text-right">{formatCurrency(Number(item.unitPrice))}</td>
                        <td className="py-3 text-right font-medium">{formatCurrency(Number(item.totalPrice))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-4">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(Number(invoice.subtotal))}</span>
                  </div>
                  {Number(invoice.taxAmount) > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax:</span>
                      <span>{formatCurrency(Number(invoice.taxAmount))}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Paid Amount:</span>
                    <span>{formatCurrency(paidAmount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-destructive">
                    <span>Balance Due:</span>
                    <span>{formatCurrency(dueAmount)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Payment Status</span>
                  <div className="mt-1">{getStatusBadge(invoice.status)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Billed</span>
                  <p className="text-lg font-semibold">{formatCurrency(totalAmount)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Remaining Balance</span>
                  <p className={`text-lg font-semibold ${dueAmount > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                    {formatCurrency(dueAmount)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="hidden print:block">
          <PrintableInvoice invoice={invoice as any} />
        </div>
      </div>
    </PageGuard>
  );
}
