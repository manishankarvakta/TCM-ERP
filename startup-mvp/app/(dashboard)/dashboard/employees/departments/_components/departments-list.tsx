"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiArrowLeft, FiLayers } from "react-icons/fi";
import { format } from "date-fns";
import { trashDepartment } from "../_actions/department.action";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: string;
  createdAt: Date;
  _count?: {
    Employees: number;
  };
}

interface DepartmentsListProps {
  data: Department[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  search: string;
  status: string;
}

export default function DepartmentsList({ data, pagination, search: initialSearch, status }: DepartmentsListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState(initialSearch);

  const handleSearch = (val: string) => {
    setSearch(val);
    router.push(`/dashboard/employees/departments?search=${encodeURIComponent(val)}&status=${status}`);
  };

  const handleTrash = async (id: string) => {
    if (!confirm("Move this Department to trash?")) return;
    const res = await trashDepartment(id);
    if (res.success) {
      toast({ title: "Trashed", description: "Department moved to trash" });
      router.refresh();
    } else {
      toast({ title: "Error", description: res.error || "Failed to trash record", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/employees">
              <FiArrowLeft className="mr-2 h-4 w-4" />
              Back to Directory
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Departments Master</h1>
            <p className="text-sm text-muted-foreground">
              Organizational divisions for workforce allocation and team structure
            </p>
          </div>
        </div>
        <Button size="sm" asChild className="gap-2">
          <Link href="/dashboard/employees/departments?action=create">
            <FiPlus className="h-4 w-4" />
            Add Department
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search department name or code..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 h-9 text-xs"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={status === "all" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => router.push("/dashboard/employees/departments?status=all")}
              >
                All Departments ({pagination.total})
              </Button>
              <Button
                variant={status === "trash" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => router.push("/dashboard/employees/departments?status=trash")}
              >
                Trash
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-28">Code</TableHead>
                  <TableHead>Department Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Assigned Employees</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No departments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-mono font-semibold text-xs text-primary">{dept.code}</TableCell>
                      <TableCell className="font-bold text-sm text-foreground">{dept.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {dept.description || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {dept._count?.Employees || 0} Staff
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {dept.status === "trash" ? (
                          <Badge variant="destructive">Trash</Badge>
                        ) : dept.status === "inactive" ? (
                          <Badge variant="secondary">Inactive</Badge>
                        ) : (
                          <Badge className="bg-emerald-600">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {format(new Date(dept.createdAt), "yyyy-MM-dd")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/dashboard/employees/departments?action=edit&id=${dept.id}`}>
                              <FiEdit className="h-4 w-4 text-amber-600" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleTrash(dept.id)}
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
  );
}
