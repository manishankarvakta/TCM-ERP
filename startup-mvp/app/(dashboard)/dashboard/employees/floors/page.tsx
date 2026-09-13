import React from "react";
import { prisma } from "@/lib/prisma";
import PageGuard from "@/components/permissions/page-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FiLayers, FiPlus } from "react-icons/fi";

export default async function FloorsMasterPage() {
  const floors = await prisma.floor.findMany({
    include: {
      lines: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <PageGuard permissionKey="peoples.employees" requiredOperation="view">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Factory Floors Master</h1>
            <p className="text-sm text-muted-foreground">
              Manage physical floors and operational production zones
            </p>
          </div>
          <Button size="sm" className="gap-2">
            <FiPlus className="h-4 w-4" />
            Add New Floor
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FiLayers className="text-primary" />
              Floor Directory
            </CardTitle>
            <CardDescription>All configured factory floors and associated lines</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-24">Code</TableHead>
                    <TableHead>Floor Name</TableHead>
                    <TableHead>Linked Production Lines</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {floors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No factory floors created yet. Click "Add New Floor" to initialize.
                      </TableCell>
                    </TableRow>
                  ) : (
                    floors.map((floor) => (
                      <TableRow key={floor.id}>
                        <TableCell className="font-mono font-semibold text-primary">{floor.code}</TableCell>
                        <TableCell className="font-medium text-foreground">{floor.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {floor.lines.length === 0 ? (
                              <span className="text-xs text-muted-foreground">No lines assigned</span>
                            ) : (
                              floor.lines.map((line) => (
                                <Badge key={line.id} variant="secondary" className="text-[10px]">
                                  {line.name}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {floor.status === "active" ? (
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
