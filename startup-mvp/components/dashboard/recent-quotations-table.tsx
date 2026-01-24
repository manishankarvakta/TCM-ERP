"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";

interface RecentQuotation {
  id: string;
  quotationNumber: string;
  subject: string;
  status: string;
  total: number;
  grandTotal: number;
  createdAt: Date;
  client: {
    id: string;
    name: string | null;
    company: string | null;
    email: string;
  };
  submittedBy: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface RecentQuotationsTableProps {
  quotations: RecentQuotation[];
}

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    DRAFT: { label: "Draft", variant: "outline" },
    SENT: { label: "Sent", variant: "secondary" },
    ACCEPTED: { label: "Accepted", variant: "default" },
    REJECTED: { label: "Rejected", variant: "destructive" },
    EXPIRED: { label: "Expired", variant: "outline" },
    REVISED: { label: "Revised", variant: "secondary" },
  };

  const config = statusConfig[status] || { label: status, variant: "outline" };

  return (
    <Badge variant={config.variant} className="text-xs font-normal">
      {config.label}
    </Badge>
  );
};

export default function RecentQuotationsTable({ quotations }: RecentQuotationsTableProps) {
  if (quotations.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-sm text-muted-foreground">No quotations found</p>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return `৳ ${new Intl.NumberFormat('en-BD', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-10 text-sm font-medium">Quotation #</TableHead>
            <TableHead className="h-10 text-sm font-medium">Client</TableHead>
            <TableHead className="h-10 text-sm font-medium">Subject</TableHead>
            <TableHead className="h-10 text-sm font-medium">Status</TableHead>
            <TableHead className="h-10 text-sm font-medium text-right">Amount</TableHead>
            <TableHead className="h-10 text-sm font-medium">Date</TableHead>
            <TableHead className="h-10 text-sm font-medium">Submitted By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotations.map((quotation) => (
            <TableRow key={quotation.id} className="h-12">
              <TableCell className="font-medium text-sm">
                <Link
                  href={`/dashboard/quotations/${quotation.id}`}
                  className="text-primary hover:underline"
                >
                  {quotation.quotationNumber}
                </Link>
              </TableCell>
              <TableCell className="text-sm">
                {quotation.client.name || quotation.client.company || quotation.client.email}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {quotation.subject || "—"}
              </TableCell>
              <TableCell>
                {getStatusBadge(quotation.status)}
              </TableCell>
              <TableCell className="text-sm font-medium text-right">
                {formatCurrency(quotation.grandTotal || quotation.total || 0)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(quotation.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {quotation.submittedBy.name || quotation.submittedBy.email}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

