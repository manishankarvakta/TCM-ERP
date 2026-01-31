"use client";

import React from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { useRouter } from "next/navigation";

interface AdjustmentDetailsProps {
  adjustment: any;
}

export default function AdjustmentDetails({ adjustment }: AdjustmentDetailsProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex  items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Adjustment {adjustment.adjustmentNumber}</h1>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
           </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date</p>
                <p>{format(new Date(adjustment.date), "dd MMMM yyyy")}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={
                  adjustment.status === "COMPLETED" ? "default" : 
                  adjustment.status === "DRAFT" ? "secondary" : "destructive"
                }>
                  {adjustment.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Warehouse</p>
                <p>{adjustment.warehouse.name}</p>
              </div>
              <div>
                 <p className="text-sm font-medium text-muted-foreground">Created By</p>
                 <p>{adjustment.createdByUser.name}</p>
              </div>
               <div>
                 <p className="text-sm font-medium text-muted-foreground">Voucher</p>
                 <p>{adjustment.voucher?.voucherNumber || "N/A"}</p>
              </div>
            </div>
            {adjustment.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Notes</p>
                <p className="text-sm mt-1">{adjustment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
             <CardTitle className="flex justify-between">
                <span>Items ({adjustment.items.length})</span>
             </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustment.items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.item.code}</TableCell>
                    <TableCell>{item.item.name}</TableCell>
                    <TableCell className="text-right">
                       <span className={Number(item.quantity) > 0 ? "text-green-600" : "text-red-600"}>
                          {Number(item.quantity) > 0 ? "+" : ""}{Number(item.quantity)} {item.item.unit.symbol}
                       </span>
                    </TableCell>
                    <TableCell className="text-right">{Number(item.unitRate).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(item.amount).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
