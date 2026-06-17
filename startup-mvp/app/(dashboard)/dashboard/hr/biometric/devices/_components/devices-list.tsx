"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { FiSearch, FiEdit, FiPower, FiMoreVertical, FiHardDrive, FiRefreshCw } from "react-icons/fi";
import { toggleBiometricDeviceStatus } from "../_actions/device.action";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { BiometricDevice } from "@prisma/client";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface DevicesListClientProps {
  initialDevices: BiometricDevice[];
  initialPagination: Pagination;
  initialSearch: string;
  permissions?: {
    view: boolean;
    manage: boolean;
  };
}

export default function DevicesListClient({
  initialDevices = [],
  initialPagination,
  initialSearch,
  permissions,
}: DevicesListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleSearch = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`/dashboard/hr/biometric/devices?${params.toString()}`);
  };

  const handleToggleStatus = async (id: string) => {
    startTransition(async () => {
      const result = await toggleBiometricDeviceStatus(id);
      if (result.success) {
        toast({
          title: "Success",
          description: "Device status updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to toggle status",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm flex items-center gap-2">
          <div className="relative w-full">
            <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, serial, or location..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={() => router.refresh()}>
            <FiRefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Device Name</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Connection</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Last Ping</TableHead>
              <TableHead>Status</TableHead>
              {permissions?.manage && <TableHead className="w-[80px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialDevices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={permissions?.manage ? 8 : 7} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <FiSearch className="mb-2 h-8 w-8" />
                    <p>No devices found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              initialDevices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="p-2 bg-muted rounded-md">
                          <FiHardDrive className="h-4 w-4 text-muted-foreground" />
                        </div>
                        {device.lastPingAt && (new Date().getTime() - new Date(device.lastPingAt).getTime() < 15 * 60 * 1000) ? (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-white dark:border-gray-950"></span>
                          </span>
                        ) : (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white dark:border-gray-950"></span>
                          </span>
                        )}
                      </div>
                      <span className="font-medium">{device.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{device.serialNumber}</TableCell>
                  <TableCell>{device.deviceType}</TableCell>
                  <TableCell>
                    {device.connectionMode}
                    {device.ipAddress && (
                      <span className="block text-xs text-muted-foreground">
                        {device.ipAddress}:{device.port}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{device.location || "Unassigned"}</TableCell>
                  <TableCell>
                    {device.lastPingAt
                      ? format(new Date(device.lastPingAt), "MMM d, h:mm a")
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={device.isActive ? "default" : "secondary"}>
                      {device.isActive ? "Active" : "Inactive"}
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
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/hr/biometric/devices/${device.id}/edit`}>
                              <FiEdit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(device.id)}
                            disabled={isPending}
                          >
                            <FiPower className="mr-2 h-4 w-4" />
                            {device.isActive ? "Deactivate" : "Activate"}
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
            {Math.min(
              initialPagination.page * initialPagination.limit,
              initialPagination.total
            )}{" "}
            of {initialPagination.total} entries
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={initialPagination.page <= 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", (initialPagination.page - 1).toString());
                router.push(`/dashboard/hr/biometric/devices?${params.toString()}`);
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
                router.push(`/dashboard/hr/biometric/devices?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
