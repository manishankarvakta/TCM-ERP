"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FiSearch, FiEdit, FiPower, FiMoreVertical, FiPlus, FiTrash2 } from "react-icons/fi";
import {
  createEmployeeDeviceMapping,
  updateEmployeeDeviceMapping,
  toggleEmployeeDeviceMappingStatus,
  deleteEmployeeDeviceMapping,
} from "../_actions/mapping.action";
import { employeeDeviceMappingSchema, EmployeeDeviceMappingFormData } from "../_schemas/mapping.schema";
import { useToast } from "@/hooks/use-toast";
import { EmployeeDeviceMap } from "@prisma/client";

interface MappingWithRelations extends EmployeeDeviceMap {
  employee: {
    id: string;
    name: string;
    employeeCode: string | null;
    department: string | null;
    designation: string | null;
  };
  device: {
    id: string;
    name: string;
    serialNumber: string | null;
    location: string | null;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface MappingListClientProps {
  initialMappings: MappingWithRelations[];
  initialPagination: Pagination;
  initialSearch: string;
  initialDeviceId?: string;
  employees: any[];
  devices: any[];
  permissions?: {
    view: boolean;
    manage: boolean;
  };
}

export default function MappingListClient({
  initialMappings = [],
  initialPagination,
  initialSearch,
  initialDeviceId = "",
  employees,
  devices,
  permissions,
}: MappingListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const employeeOptions = employees.map((emp) => ({
    label: emp.name,
    value: emp.id,
    description: emp.employeeCode || undefined,
  }));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<EmployeeDeviceMappingFormData>({
    resolver: zodResolver(employeeDeviceMappingSchema as any),
    defaultValues: {
      employeeId: "",
      deviceId: initialDeviceId || "",
      deviceUserId: "",
      isActive: true,
    },
  });

  const handleSearch = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("search", value);
    else params.delete("search");
    params.set("page", "1");
    router.push(`/dashboard/hr/biometric/mapping?${params.toString()}`);
  };

  const openAddModal = () => {
    setModalMode("create");
    setEditingId(null);
    form.reset({ employeeId: "", deviceId: initialDeviceId || "", deviceUserId: "", isActive: true });
    setIsModalOpen(true);
  };

  const openEditModal = (mapping: MappingWithRelations) => {
    setModalMode("edit");
    setEditingId(mapping.id);
    form.reset({
      employeeId: mapping.employeeId,
      deviceId: mapping.deviceId,
      deviceUserId: mapping.deviceUserId,
      isActive: mapping.isActive,
    });
    setIsModalOpen(true);
  };

  const onFormSubmit = async (data: EmployeeDeviceMappingFormData) => {
    startTransition(async () => {
      let result;
      if (modalMode === "create") {
        result = await createEmployeeDeviceMapping(data);
      } else if (editingId) {
        result = await updateEmployeeDeviceMapping(editingId, data);
      }

      if (result?.success) {
        toast({ title: "Success", description: `Mapping ${modalMode === "create" ? "created" : "updated"} successfully` });
        setIsModalOpen(false);
      } else {
        toast({ title: "Error", description: result?.error || "Something went wrong", variant: "destructive" });
      }
    });
  };

  const handleToggleStatus = async (id: string) => {
    startTransition(async () => {
      const result = await toggleEmployeeDeviceMappingStatus(id);
      if (result.success) {
        toast({ title: "Success", description: "Mapping status updated" });
      } else {
        toast({ title: "Error", description: result.error || "Failed to toggle status", variant: "destructive" });
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this mapping?")) return;
    
    startTransition(async () => {
      const result = await deleteEmployeeDeviceMapping(id);
      if (result.success) {
        toast({ title: "Success", description: "Mapping deleted successfully" });
      } else {
        toast({ title: "Error", description: result.error || "Failed to delete mapping", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employees or devices..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {permissions?.manage && (
          <Button onClick={openAddModal}>
            <FiPlus className="mr-2 h-4 w-4" />
            Add Mapping
          </Button>
        )}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead>Biometric ID / PIN</TableHead>
              <TableHead>Status</TableHead>
              {permissions?.manage && <TableHead className="w-[80px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialMappings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={permissions?.manage ? 6 : 5} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <FiSearch className="mb-2 h-8 w-8" />
                    <p>No mappings found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              initialMappings.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell>
                    <div className="font-medium">{mapping.employee.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {mapping.employee.employeeCode || "No Code"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{mapping.device.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {mapping.device.location || "No Location"}
                    </div>
                  </TableCell>
                  <TableCell>{mapping.device.serialNumber || "N/A"}</TableCell>
                  <TableCell className="font-medium">{mapping.deviceUserId}</TableCell>
                  <TableCell>
                    <Badge variant={mapping.isActive ? "default" : "secondary"}>
                      {mapping.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {permissions?.manage && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <FiMoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(mapping)}>
                            <FiEdit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(mapping.id)}
                            disabled={isPending}
                          >
                            <FiPower className="mr-2 h-4 w-4" />
                            {mapping.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(mapping.id)}
                            disabled={isPending}
                            className="text-destructive focus:text-destructive"
                          >
                            <FiTrash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {initialPagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Showing {(initialPagination.page - 1) * initialPagination.limit + 1} to{" "}
            {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)} of {initialPagination.total} entries
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={initialPagination.page <= 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", (initialPagination.page - 1).toString());
                router.push(`/dashboard/hr/biometric/mapping?${params.toString()}`);
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={initialPagination.page >= initialPagination.totalPages}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", (initialPagination.page + 1).toString());
                router.push(`/dashboard/hr/biometric/mapping?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={form.handleSubmit(onFormSubmit as any)}>
            <DialogHeader>
              <DialogTitle>{modalMode === "create" ? "Add Mapping" : "Edit Mapping"}</DialogTitle>
              <DialogDescription>
                Map an employee to a specific biometric device using their Device PIN / User ID.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="employeeId">Employee</Label>
                <SearchableSelect
                  options={employeeOptions}
                  value={form.watch("employeeId")}
                  onValueChange={(val) => form.setValue("employeeId", val || "")}
                  placeholder="Select Employee..."
                  searchPlaceholder="Search employees..."
                />
                {form.formState.errors.employeeId && (
                  <p className="text-xs text-destructive">{form.formState.errors.employeeId.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="deviceId">Device</Label>
                <SearchableSelect
                  value={form.watch("deviceId")}
                  onValueChange={(val) => form.setValue("deviceId", val || "")}
                  placeholder="Select Device"
                  options={devices.map((dev) => ({
                    value: dev.id,
                    label: dev.name,
                    description: dev.serialNumber || undefined
                  }))}
                />
                {form.formState.errors.deviceId && (
                  <p className="text-xs text-destructive">{form.formState.errors.deviceId.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="deviceUserId">Device PIN / User ID</Label>
                <Input
                  id="deviceUserId"
                  placeholder="e.g. 1001"
                  {...form.register("deviceUserId")}
                />
                <p className="text-xs text-muted-foreground">The numerical ID the user punches in with.</p>
                {form.formState.errors.deviceUserId && (
                  <p className="text-xs text-destructive">{form.formState.errors.deviceUserId.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="isActive" className="cursor-pointer">Active Status</Label>
                <Switch
                  id="isActive"
                  checked={form.watch("isActive")}
                  onCheckedChange={(checked) => form.setValue("isActive", checked)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Mapping"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
