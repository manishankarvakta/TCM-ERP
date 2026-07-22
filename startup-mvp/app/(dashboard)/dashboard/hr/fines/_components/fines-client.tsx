"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiTrash2,
  FiTrash,
  FiAlertTriangle,
  FiEye,
  FiEdit,
  FiRefreshCw,
  FiArchive,
} from "react-icons/fi";
import {
  updateFineStatus,
  deleteFine,
  trashFine,
  restoreFine,
  bulkUpdateFineStatus,
  bulkTrashFines,
  bulkRestoreFines,
  bulkDeleteFines,
} from "../_actions/fine.action";
import { toast } from "sonner";
import AddFineDialog from "./add-fine-dialog";
import FineDetailsDialog from "./fine-details-dialog";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { FineStatus } from "@prisma/client";

interface FineItem {
  id: string;
  amount: number;
  fineDate: string | Date;
  reason: string;
  status: FineStatus;
  isTrash?: boolean;
  createdAt: string | Date;
  payrollId?: string | null;
  employee: {
    id: string;
    name: string;
    employeeCode: string | null;
    designation: string | null;
    department: string | null;
    photo?: string | null;
  };
  creator?: { name: string | null } | null;
  approver?: { name: string | null } | null;
}

interface FinesClientProps {
  initialFines: FineItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  currentSearch: string;
  currentStatus: string;
  currentTab?: string;
  permissions: {
    canCreate: boolean;
    canApprove: boolean;
    canDelete: boolean;
  };
}

export default function FinesClient({
  initialFines,
  pagination,
  currentSearch,
  currentStatus,
  currentTab = "all",
  permissions,
}: FinesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(currentSearch);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Details dialog state
  const [selectedFine, setSelectedFine] = useState<FineItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Edit dialog state
  const [editingFine, setEditingFine] = useState<FineItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Confirm dialog state
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    variant: "destructive" | "default" | "outline";
    confirmText: string;
    action: () => Promise<void>;
  }>({
    open: false,
    title: "",
    description: "",
    variant: "destructive",
    confirmText: "Confirm",
    action: async () => {},
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search.trim()) {
      params.set("search", search.trim());
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`/dashboard/hr/fines?${params.toString()}`);
  };

  const handleStatusTab = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val !== "ALL") {
      params.set("status", val);
    } else {
      params.delete("status");
    }
    params.set("page", "1");
    router.push(`/dashboard/hr/fines?${params.toString()}`);
  };

  const handleMainTabChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", val);
    params.set("page", "1");
    setSelectedIds([]);
    router.push(`/dashboard/hr/fines?${params.toString()}`);
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(initialFines.map((f) => f.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  // Single Actions using Confirm Dialog Modal
  const requestStatusChange = (id: string, status: FineStatus) => {
    const actionName = status === "APPROVED" ? "Approve" : "Reject";
    setConfirmState({
      open: true,
      title: `${actionName} Fine Record`,
      description: `Are you sure you want to change status of this fine to ${status}?`,
      variant: status === "APPROVED" ? "default" : "destructive",
      confirmText: actionName,
      action: async () => {
        setLoadingId(id);
        const res = await updateFineStatus(id, status);
        setLoadingId(null);
        if (res.success) {
          toast.success(res.message);
          router.refresh();
        } else {
          toast.error(res.error);
        }
      },
    });
  };

  const requestTrash = (id: string) => {
    setConfirmState({
      open: true,
      title: "Move to Trash",
      description: "Move this fine record to trash bin?",
      variant: "destructive",
      confirmText: "Move to Trash",
      action: async () => {
        setLoadingId(id);
        const res = await trashFine(id);
        setLoadingId(null);
        if (res.success) {
          toast.success(res.message);
          router.refresh();
        } else {
          toast.error(res.error);
        }
      },
    });
  };

  const requestRestore = (id: string) => {
    setConfirmState({
      open: true,
      title: "Restore Fine Record",
      description: "Restore this fine record back to the active list?",
      variant: "default",
      confirmText: "Restore",
      action: async () => {
        setLoadingId(id);
        const res = await restoreFine(id);
        setLoadingId(null);
        if (res.success) {
          toast.success(res.message);
          router.refresh();
        } else {
          toast.error(res.error);
        }
      },
    });
  };

  const requestDelete = (id: string) => {
    setConfirmState({
      open: true,
      title: "Permanently Delete Fine",
      description: "Are you sure you want to permanently delete this fine record? This action cannot be undone.",
      variant: "destructive",
      confirmText: "Delete Permanently",
      action: async () => {
        setLoadingId(id);
        const res = await deleteFine(id);
        setLoadingId(null);
        if (res.success) {
          toast.success(res.message);
          router.refresh();
        } else {
          toast.error(res.error);
        }
      },
    });
  };

  // Bulk Actions
  const handleBulkApprove = () => {
    setConfirmState({
      open: true,
      title: "Bulk Approve Fines",
      description: `Are you sure you want to approve ${selectedIds.length} selected fine(s)?`,
      variant: "default",
      confirmText: "Approve Selected",
      action: async () => {
        const res = await bulkUpdateFineStatus(selectedIds, "APPROVED");
        if (res.success) {
          toast.success(res.message);
          setSelectedIds([]);
          router.refresh();
        } else {
          toast.error(res.error);
        }
      },
    });
  };

  const handleBulkTrash = () => {
    setConfirmState({
      open: true,
      title: "Bulk Move to Trash",
      description: `Move ${selectedIds.length} selected fine(s) to trash?`,
      variant: "destructive",
      confirmText: "Move to Trash",
      action: async () => {
        const res = await bulkTrashFines(selectedIds);
        if (res.success) {
          toast.success(res.message);
          setSelectedIds([]);
          router.refresh();
        } else {
          toast.error(res.error);
        }
      },
    });
  };

  const handleBulkRestore = () => {
    setConfirmState({
      open: true,
      title: "Bulk Restore Fines",
      description: `Restore ${selectedIds.length} selected fine(s)?`,
      variant: "default",
      confirmText: "Restore Selected",
      action: async () => {
        const res = await bulkRestoreFines(selectedIds);
        if (res.success) {
          toast.success(res.message);
          setSelectedIds([]);
          router.refresh();
        } else {
          toast.error(res.error);
        }
      },
    });
  };

  const handleBulkDelete = () => {
    setConfirmState({
      open: true,
      title: "Bulk Permanently Delete",
      description: `Permanently delete ${selectedIds.length} selected fine(s)? This cannot be undone.`,
      variant: "destructive",
      confirmText: "Delete Permanently",
      action: async () => {
        const res = await bulkDeleteFines(selectedIds);
        if (res.success) {
          toast.success(res.message);
          setSelectedIds([]);
          router.refresh();
        } else {
          toast.error(res.error);
        }
      },
    });
  };

  const getStatusBadge = (status: FineStatus) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">Approved</Badge>;
      case "APPLIED":
        return <Badge className="bg-blue-500/15 text-blue-700 border-blue-200">Applied in Payroll</Badge>;
      case "CANCELLED":
        return <Badge variant="secondary" className="bg-gray-200 text-gray-700">Cancelled</Badge>;
      case "PENDING":
      default:
        return <Badge className="bg-amber-500/15 text-amber-700 border-amber-200">Pending Approval</Badge>;
    }
  };

  const totalAmount = initialFines.reduce((acc, curr) => acc + curr.amount, 0);
  const pendingCount = initialFines.filter((f) => f.status === "PENDING").length;
  const approvedCount = initialFines.filter((f) => f.status === "APPROVED" || f.status === "APPLIED").length;

  return (
    <div className="space-y-6">
      {/* View Details Modal */}
      <FineDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        fine={selectedFine}
      />

      {/* Edit Dialog Modal */}
      <AddFineDialog
        initialData={editingFine}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => router.refresh()}
      />

      {/* Confirmation Modal */}
      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState((prev) => ({ ...prev, open }))}
        title={confirmState.title}
        description={confirmState.description}
        variant={confirmState.variant}
        confirmText={confirmState.confirmText}
        onConfirm={async () => {
          await confirmState.action();
          setConfirmState((prev) => ({ ...prev, open: false }));
        }}
      />

      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fines & Penalties</h1>
          <p className="text-sm text-muted-foreground">
            Impose and manage employee penalties, automatically deducted during payroll runs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {permissions.canCreate && currentTab !== "trash" && (
            <AddFineDialog onSuccess={() => router.refresh()} />
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {currentTab !== "trash" && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-rose-500/10 p-3 text-rose-600">
                  <FiAlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Recorded Fines</p>
                  <h3 className="text-2xl font-bold">{formatCurrency(totalAmount)}</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-amber-500/10 p-3 text-amber-600">
                  <FiAlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Approvals</p>
                  <h3 className="text-2xl font-bold">{pendingCount}</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-600">
                  <FiCheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Approved / Active</p>
                  <h3 className="text-2xl font-bold">{approvedCount}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs (All vs Trash) & Status Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-3">
          <div className="flex items-center gap-2">
            <Button
              variant={currentTab === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleMainTabChange("all")}
            >
              All Records
            </Button>
            <Button
              variant={currentTab === "trash" ? "destructive" : "ghost"}
              size="sm"
              onClick={() => handleMainTabChange("trash")}
              className="gap-1.5"
            >
              <FiArchive className="h-4 w-4" />
              Trash Bin
            </Button>
          </div>

          <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-72">
            <div className="relative w-full">
              <FiSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search employee or reason..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">Search</Button>
          </form>
        </div>

        {currentTab !== "trash" && (
          <Tabs defaultValue={currentStatus} onValueChange={handleStatusTab} className="w-full">
            <TabsList>
              <TabsTrigger value="ALL">All Status</TabsTrigger>
              <TabsTrigger value="PENDING">Pending</TabsTrigger>
              <TabsTrigger value="APPROVED">Approved</TabsTrigger>
              <TabsTrigger value="APPLIED">Applied</TabsTrigger>
              <TabsTrigger value="CANCELLED">Cancelled</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Bulk Operation Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
          <span className="font-medium text-primary">
            {selectedIds.length} item(s) selected
          </span>
          <div className="flex items-center gap-2">
            {currentTab !== "trash" && permissions.canApprove && (
              <Button size="sm" variant="outline" className="bg-background" onClick={handleBulkApprove}>
                <FiCheckCircle className="mr-1.5 h-4 w-4 text-emerald-600" /> Bulk Approve
              </Button>
            )}
            {currentTab !== "trash" && (
              <Button size="sm" variant="outline" className="bg-background text-amber-700 border-amber-200 hover:bg-amber-50" onClick={handleBulkTrash}>
                <FiTrash className="mr-1.5 h-4 w-4 text-amber-600" /> Move to Trash
              </Button>
            )}
            {currentTab === "trash" && (
              <Button size="sm" variant="outline" className="bg-background text-emerald-700 border-emerald-200" onClick={handleBulkRestore}>
                <FiRefreshCw className="mr-1.5 h-4 w-4" /> Restore Selected
              </Button>
            )}
            {currentTab === "trash" && permissions.canDelete && (
              <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                <FiTrash2 className="mr-1.5 h-4 w-4" /> Delete Permanently
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={initialFines.length > 0 && selectedIds.length === initialFines.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="max-w-[260px]">Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialFines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {currentTab === "trash" ? "Trash bin is empty." : "No fine records found."}
                </TableCell>
              </TableRow>
            ) : (
              initialFines.map((fine) => {
                const isSelected = selectedIds.includes(fine.id);
                const initials = fine.employee.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <TableRow key={fine.id} className={isSelected ? "bg-muted/40" : undefined}>
                    <TableCell className="w-12">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectRow(fine.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border">
                          <AvatarImage src={fine.employee.photo || undefined} alt={fine.employee.name} />
                          <AvatarFallback className="bg-destructive/10 text-destructive font-medium text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm leading-tight">{fine.employee.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {fine.employee.employeeCode || "N/A"} {fine.employee.designation ? `• ${fine.employee.designation}` : ""}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(fine.fineDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </TableCell>
                    <TableCell className="font-semibold text-rose-600">
                      {formatCurrency(fine.amount)}
                    </TableCell>
                    <TableCell className="max-w-[260px] text-sm text-muted-foreground truncate" title={fine.reason}>
                      {fine.reason}
                    </TableCell>
                    <TableCell>{getStatusBadge(fine.status)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {/* View Details Button */}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="View Details"
                        onClick={() => {
                          setSelectedFine(fine);
                          setDetailsOpen(true);
                        }}
                      >
                        <FiEye className="h-4 w-4" />
                      </Button>

                      {/* Edit Button */}
                      {currentTab !== "trash" && fine.status === "PENDING" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          title="Edit Fine"
                          onClick={() => {
                            setEditingFine(fine);
                            setEditOpen(true);
                          }}
                        >
                          <FiEdit className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Approve Action */}
                      {currentTab !== "trash" && fine.status === "PENDING" && permissions.canApprove && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                          disabled={loadingId === fine.id}
                          onClick={() => requestStatusChange(fine.id, "APPROVED")}
                        >
                          <FiCheckCircle className="mr-1 h-3.5 w-3.5" /> Approve
                        </Button>
                      )}

                      {/* Move to Trash Action */}
                      {currentTab !== "trash" && fine.status !== "APPLIED" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                          title="Move to Trash"
                          disabled={loadingId === fine.id}
                          onClick={() => requestTrash(fine.id)}
                        >
                          <FiTrash className="h-4 w-4 text-amber-600" />
                        </Button>
                      )}

                      {/* Restore Action */}
                      {currentTab === "trash" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-emerald-600 border-emerald-200"
                          disabled={loadingId === fine.id}
                          onClick={() => requestRestore(fine.id)}
                        >
                          <FiRefreshCw className="mr-1 h-3.5 w-3.5" /> Restore
                        </Button>
                      )}

                      {/* Delete Permanently Action */}
                      {currentTab === "trash" && permissions.canDelete && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Delete Permanently"
                          disabled={loadingId === fine.id}
                          onClick={() => requestDelete(fine.id)}
                        >
                          <FiTrash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
