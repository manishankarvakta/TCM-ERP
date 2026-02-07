"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getClientProjectLedger, ProjectFinancialSummary } from "@/app/actions/project-reports";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ClientOption {
  id: string;
  name: string;
  company: string | null;
}

interface ProjectLedgerViewProps {
  clients: ClientOption[];
}

export function ProjectLedgerView({ clients }: ProjectLedgerViewProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProjectFinancialSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchLedger = async (clientId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getClientProjectLedger(clientId);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || "Failed to fetch ledger");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClientId) {
      fetchLedger(selectedClientId);
    } else {
      setData([]);
    }
  }, [selectedClientId]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Client</CardTitle>
          <CardDescription>Choose a client to view their project-wise financial status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full md:w-[300px]">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} {client.company ? `(${client.company})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedClientId && (
        <Card>
          <CardHeader>
            <CardTitle>Project Ledger</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-red-500 p-4">{error}</div>
            ) : data.length === 0 ? (
              <div className="text-center text-muted-foreground p-8">No project data found for this client.</div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Order Value</TableHead>
                      <TableHead className="text-right">Invoiced</TableHead>
                      <TableHead className="text-right">Received (Cash In)</TableHead>
                      <TableHead className="text-right">AR Balance (Due)</TableHead>
                      <TableHead className="text-right text-muted-foreground">Advance Bal.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row) => (
                      <TableRow key={row.orderId}>
                        <TableCell className="font-medium">{row.orderNumber}</TableCell>
                        <TableCell>{new Date(row.orderDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                            <span className="capitalize px-2 py-1 rounded-full bg-slate-100 text-xs">
                                {row.status.toLowerCase()}
                            </span>
                        </TableCell>
                        <TableCell className="text-right text-blue-600 font-semibold">
                            {formatCurrency(row.contractValue)}
                        </TableCell>
                        <TableCell className="text-right">
                            {formatCurrency(row.invoicedValue)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-semibold">
                            {formatCurrency(row.receiptsTotal)}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-semibold">
                            {formatCurrency(row.arBalance)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(row.advanceBalance)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={3}>Totals</TableCell>
                        <TableCell className="text-right text-blue-600">
                            {formatCurrency(data.reduce((sum, r) => sum + r.contractValue, 0))}
                        </TableCell>
                        <TableCell className="text-right">
                            {formatCurrency(data.reduce((sum, r) => sum + r.invoicedValue, 0))}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                            {formatCurrency(data.reduce((sum, r) => sum + r.receiptsTotal, 0))}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                            {formatCurrency(data.reduce((sum, r) => sum + r.arBalance, 0))}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                             {formatCurrency(data.reduce((sum, r) => sum + r.advanceBalance, 0))}
                        </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
