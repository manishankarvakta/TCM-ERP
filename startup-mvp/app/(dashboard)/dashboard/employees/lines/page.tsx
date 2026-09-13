import React from "react";
import { prisma } from "@/lib/prisma";
import PageGuard from "@/components/permissions/page-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FiPlus, FiGrid } from "react-icons/fi";

export default async function ProductionLinesMasterPage() {
  const lines = await prisma.line.findMany({
    include: {
      floor: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <PageGuard permissionKey="peoples.employees" requiredOperation="view">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Production Lines Master</h1>
            <p className="text-sm text-muted-foreground">
              Configure production lines assigned to factory floors
            </p>
          </div>
          <Button size="sm" className="gap-2">
            <FiPlus className="h-4 w-4" />
            Add New Line
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FiGrid className="text-primary" />
              Production Line Register
            </CardTitle>
            <CardDescription>Lines linked to plant floors for workforce assignment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-24">Line Code</TableHead>
                    <TableHead>Line Name</TableHead>
                    <TableHead>Assigned Floor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No production lines created yet. Click "Add New Line" to initialize.
                      </TableCell>
                    </TableRow>
                  ) : (
                    lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="font-mono font-semibold text-primary">{line.code}</TableCell>
                        <TableCell className="font-medium text-foreground">{line.name}</TableCell>
                        <TableCell className="font-medium">
                          {line.floor ? `${line.floor.code} - ${line.floor.name}` : "-"}
                        </TableCell>
                        <TableCell>
                          {line.status === "active" ? (
                            <Badge className="bg-emerald-600">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageGuard>
  );
}
