"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiArrowLeft, FiFilter } from "react-icons/fi";
import { format } from "date-fns";
import { trashDesignation } from "../_actions/designation.action";
import { getDepartments } from "../../departments/_actions/department.action";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface Designation {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  Department?: { id: string; name: string; code: string } | null;
  employeeCount?: number;
  status: string;
  createdAt: Date;
}

interface DesignationsListProps {
  data: Designation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  search: string;
  status: string;
  department?: string;
}

export default function DesignationsList({
  data,
  pagination,
  search: initialSearch,
  status,
  department: initialDepartment = "all",
}: DesignationsListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState(initialSearch);
  const [selectedDept, setSelectedDept] = useState(initialDepartment);
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    async function loadDepts() {
      const res = await getDepartments(1, 1000, "", "active");
      if (res.success && res.data) {
        setDepartments(res.data);
      }
    }
    loadDepts();
  }, []);

  const handleSearch = (val: string) => {
    setSearch(val);
    router.push(
      `/dashboard/employees/designations?search=${encodeURIComponent(val)}&status=${status}&department=${encodeURIComponent(selectedDept)}`
    );
  };

  const handleDeptFilter = (deptVal: string) => {
    setSelectedDept(deptVal);
    router.push(
      `/dashboard/employees/designations?search=${encodeURIComponent(search)}&status=${status}&department=${encodeURIComponent(deptVal)}`
    );
  };

  const handleTrash = async (id: string) => {
    if (!confirm("Move this Designation to trash?")) return;
    const res = await trashDesignation(id);
    if (res.success) {
      toast({ title: "Trashed", description: "Designation moved to trash" });
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
            <h1 className="text-2xl font-bold tracking-tight">Designations Master</h1>
            <p className="text-sm text-muted-foreground">
              Job titles, rank hierarchy, and organizational roles for staff profiling
            </p>
          </div>
        </div>
        <Button size="sm" asChild className="gap-2">
          <Link href="/dashboard/employees/designations?action=create">
            <FiPlus className="h-4 w-4" />
            Add Designation
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search title or code..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 h-9 text-xs"
                />
              </div>

              {/* Department Filter */}
              <div className="w-full sm:w-56">
                <Select value={selectedDept} onValueChange={handleDeptFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <div className="flex items-center gap-2">
                      <FiFilter className="h-3.5 w-3.5 text-muted-foreground" />
                      <SelectValue placeholder="All Departments" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant={status === "all" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() =>
                  router.push(
                    `/dashboard/employees/designations?status=all&department=${encodeURIComponent(selectedDept)}`
                  )
                }
              >
                All Designations ({pagination.total})
              </Button>
              <Button
                variant={status === "trash" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() =>
                  router.push(
                    `/dashboard/employees/designations?status=trash&department=${encodeURIComponent(selectedDept)}`
                  )
                }
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
                  <TableHead>Designation Title</TableHead>
                  <TableHead>Assigned Department</TableHead>
                  <TableHead>Assigned Employees</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No designations found for selected criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((des) => (
                    <TableRow key={des.id}>
                      <TableCell className="font-mono font-semibold text-xs text-primary">{des.code || "-"}</TableCell>
                      <TableCell className="font-bold text-sm text-foreground">{des.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium text-xs bg-muted/50">
                          {des.departmentName || des.Department?.name || "Unassigned"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-semibold text-xs bg-muted">
                          {des.employeeCount || 0} Employees
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {des.status === "trash" ? (
                          <Badge variant="destructive">Trash</Badge>
                        ) : des.status === "inactive" ? (
                          <Badge variant="secondary">Inactive</Badge>
                        ) : (
                          <Badge className="bg-emerald-600">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/dashboard/employees/designations?action=edit&id=${des.id}`}>
                              <FiEdit className="h-4 w-4 text-amber-600" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleTrash(des.id)}
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
