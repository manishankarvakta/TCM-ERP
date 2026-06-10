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

interface TpnDetailsProps {
  tpn: any;
}

export default function TpnDetails({ tpn }: TpnDetailsProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Transfer Note {tpn.tpnNumber}</h1>
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
            <CardTitle>Transfer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date</p>
                <p>{format(new Date(tpn.date), "dd MMMM yyyy")}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={
                  tpn.status === "RECEIVED" ? "default" : 
                  tpn.status === "SHIPPED" ? "secondary" : "outline"
                }>
                  {tpn.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Source Warehouse</p>
                <p>{tpn.sourceWarehouse.name}</p>
              </div>
              <div>
                 <p className="text-sm font-medium text-muted-foreground">Destination Warehouse</p>
                 <p>{tpn.destinationWarehouse.name}</p>
              </div>
            </div>
            {tpn.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Notes</p>
                <p className="text-sm mt-1">{tpn.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
             <CardTitle className="flex justify-between">
                <span>Items ({tpn.items.length})</span>
             </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tpn.items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.item.code}</TableCell>
                    <TableCell>{item.item.name}</TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(item.quantity)}
                    </TableCell>
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
