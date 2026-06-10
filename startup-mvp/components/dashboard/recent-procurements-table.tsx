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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { format } from "date-fns";

export interface RecentPurchase {
  id: string;
  purchaseNumber: string;
  status: string;
  grandTotal: number;
  date: Date;
  supplier: { name: string | null; company: string | null };
}

export interface RecentGRN {
  id: string;
  grnNumber: string;
  status: string;
  date: Date;
  warehouse: { name: string };
}

export interface RecentRTV {
  id: string;
  rtvNumber: string;
  status: string;
  grandTotal: number;
  date: Date;
  supplier: { name: string | null; company: string | null };
}

export interface RecentTPN {
  id: string;
  tpnNumber: string;
  status: string;
  date: Date;
  sourceWarehouse: { name: string };
  destinationWarehouse: { name: string };
}

interface RecentProcurementsTableProps {
  purchases: RecentPurchase[];
  grns: RecentGRN[];
  rtvs: RecentRTV[];
  tpns: RecentTPN[];
}

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    DRAFT: { label: "Draft", variant: "outline" },
    APPROVED: { label: "Approved", variant: "secondary" },
    RECEIVED: { label: "Received", variant: "default" },
    PARTIALLY_RECEIVED: { label: "Part. Received", variant: "secondary" },
    COMPLETED: { label: "Completed", variant: "default" },
    SHIPPED: { label: "Shipped", variant: "secondary" },
    CANCELLED: { label: "Cancelled", variant: "destructive" },
    RETURNED: { label: "Returned", variant: "destructive" },
  };

  const config = statusConfig[status] || { label: status, variant: "outline" };

  return (
    <Badge variant={config.variant} className="text-xs font-normal">
      {config.label}
    </Badge>
  );
};

const formatCurrency = (amount: number) => {
  return `৳ ${new Intl.NumberFormat('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
};

export default function RecentProcurementsTable({ purchases, grns, rtvs, tpns }: RecentProcurementsTableProps) {
  return (
    <div className="rounded-md border p-4 bg-card">
      <Tabs defaultValue="purchases" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="grns">GRNs</TabsTrigger>
          <TabsTrigger value="rtvs">RTVs</TabsTrigger>
          <TabsTrigger value="tpns">TPNs</TabsTrigger>
        </TabsList>
        
        {/* Purchases Tab */}
        <TabsContent value="purchases">
          {purchases.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground text-sm">No recent purchases found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/procurements/purchases/${p.id}`} className="text-primary hover:underline">
                        {p.purchaseNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{p.supplier.company || p.supplier.name || "—"}</TableCell>
                    <TableCell>{getStatusBadge(p.status)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(p.grandTotal)}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(p.date), "MMM d, yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* GRNs Tab */}
        <TabsContent value="grns">
          {grns.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground text-sm">No recent GRNs found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GRN #</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grns.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/procurements/grn/${g.id}`} className="text-primary hover:underline">
                        {g.grnNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{g.warehouse.name}</TableCell>
                    <TableCell>{getStatusBadge(g.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(g.date), "MMM d, yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* RTVs Tab */}
        <TabsContent value="rtvs">
          {rtvs.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground text-sm">No recent RTVs found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>RTV #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rtvs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/procurements/rtv/${r.id}`} className="text-primary hover:underline">
                        {r.rtvNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{r.supplier.company || r.supplier.name || "—"}</TableCell>
                    <TableCell>{getStatusBadge(r.status)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(r.grandTotal)}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(r.date), "MMM d, yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* TPNs Tab */}
        <TabsContent value="tpns">
          {tpns.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground text-sm">No recent TPNs found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>TPN #</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tpns.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/procurements/tpn/${t.id}`} className="text-primary hover:underline">
                        {t.tpnNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{t.sourceWarehouse.name}</TableCell>
                    <TableCell>{t.destinationWarehouse.name}</TableCell>
                    <TableCell>{getStatusBadge(t.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(t.date), "MMM d, yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
