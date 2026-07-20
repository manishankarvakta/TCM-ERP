"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { 
  FiSearch, 
  FiEdit, 
  FiPower, 
  FiMoreVertical, 
  FiHardDrive, 
  FiRefreshCw,
  FiMapPin,
  FiUsers,
  FiActivity,
  FiGlobe,
  FiCpu
} from "react-icons/fi";
import { toggleBiometricDeviceStatus } from "../_actions/device.action";
import { checkDeviceStatus } from "../_actions/device-sync.action";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInMinutes } from "date-fns";
import { BiometricDevice } from "@prisma/client";

type DeviceWithWarehouseAndCount = BiometricDevice & {
  warehouse?: { name: string; code: string } | null;
  _count?: { deviceMappings: number } | null;
};

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface DevicesListClientProps {
  initialDevices: DeviceWithWarehouseAndCount[];
  initialPagination: Pagination;
  initialSearch: string;
  permissions?: {
    manage: boolean;
  };
}

export default function DevicesListClient({
  initialDevices,
  initialPagination,
  initialSearch,
  permissions,
}: DevicesListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [search, setSearch] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (value: string) => {
    setSearch(value);
    
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      params.set("page", "1");
      
      router.push(`/dashboard/hr/biometric/devices?${params.toString()}`);
    });
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      const result = await toggleBiometricDeviceStatus(id);
      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
      } else {
        toast({
          title: "Status Updated",
          description: `Device is now ${currentStatus ? "inactive" : "active"}.`,
        });
        router.refresh();
      }
    });
  };

  const handleCheckStatus = (deviceId: string) => {
    startTransition(async () => {
      const result = await checkDeviceStatus(deviceId);
      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Check Failed",
          description: result.error,
        });
      } else {
        toast({
          title: "Status Checked",
          description: (result as any).message,
        });
        router.refresh();
      }
    });
  };

  const isOnline = (lastPingAt: Date | null) => {
    if (!lastPingAt) return false;
    const diff = differenceInMinutes(new Date(), new Date(lastPingAt));
    return diff <= 5;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-80">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search devices..."
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

      {initialDevices.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-lg border border-dashed bg-card/50 text-muted-foreground">
          <FiSearch className="mb-4 h-10 w-10 opacity-50" />
          <p className="text-lg font-medium">No devices found</p>
          <p className="text-sm">Add your first biometric device to start syncing attendance.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {initialDevices.map((device) => {
            const online = isOnline(device.lastPingAt);
            return (
              <Card key={device.id} className="flex flex-col h-full overflow-hidden transition-all hover:shadow-md">
                <CardHeader className="pb-3 border-b bg-muted/20">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className="mt-1">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                          <FiHardDrive className="h-5 w-5" />
                        </div>
                      </div>
                      <div>
                        <CardTitle className="text-base truncate max-w-[150px] sm:max-w-[180px]" title={device.name}>
                          {device.name}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {device.serialNumber}
                        </CardDescription>
                      </div>
                    </div>
                    {permissions?.manage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
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
                            onClick={() => handleToggleStatus(device.id, device.isActive)}
                          >
                            <FiPower className="mr-2 h-4 w-4" />
                            {device.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleCheckStatus(device.id)}
                          >
                            <FiActivity className="mr-2 h-4 w-4" />
                            Sync Now
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 pt-4 pb-2 space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`relative flex h-3 w-3 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'}`}>
                        {online && (
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                        )}
                      </div>
                      <span className="font-medium">{online ? 'Online' : 'Offline'}</span>
                    </div>
                    <Badge variant={device.isActive ? "default" : "secondary"} className="font-normal text-xs">
                      {device.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-b py-2">
                    <span className="font-semibold">Technical Info:</span>
                    <span>{device.deviceType}</span>
                    <span>•</span>
                    <span>{device.connectionMode}</span>
                  </div>

                  <div className="rounded-md bg-muted/50 p-3 space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <FiMapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        {device.warehouse ? (
                          <>
                            <span className="font-medium truncate">{device.warehouse.name}</span>
                            {device.location && <span className="text-xs text-muted-foreground truncate">{device.location}</span>}
                          </>
                        ) : (
                          <span className="text-muted-foreground">{device.location || "Unassigned"}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-1 border-t border-dashed">
                      <FiGlobe className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground text-xs">IP Address: </span>
                      <span className="font-medium text-xs">{device.ipAddress || "N/A"}{device.ipAddress && device.port ? `:${device.port}` : ''}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <FiCpu className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground text-xs">Brand: </span>
                      <span className="font-medium text-xs">{device.vendor}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-dashed">
                      <FiUsers className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground text-xs">Employees: </span>
                      <span className="font-medium">{device._count?.deviceMappings || 0}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <FiActivity className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground text-xs">Last Ping: </span>
                      <span className="font-medium truncate text-xs">
                        {device.lastPingAt ? format(new Date(device.lastPingAt), "MMM d, h:mm a") : "Never"}
                      </span>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="pt-2 pb-4 border-t mt-auto gap-2">
                  <Button asChild variant="default" className="flex-1 shadow-sm text-sm" size="sm">
                    <Link href={`/dashboard/hr/biometric/devices/${device.id}`}>
                      Manage
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination component goes here, assuming it existed before but was simple. */}
      {initialPagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing page {initialPagination.page} of {initialPagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={initialPagination.page <= 1 || isPending}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", (initialPagination.page - 1).toString());
                startTransition(() => router.push(`/dashboard/hr/biometric/devices?${params.toString()}`));
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={initialPagination.page >= initialPagination.totalPages || isPending}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", (initialPagination.page + 1).toString());
                startTransition(() => router.push(`/dashboard/hr/biometric/devices?${params.toString()}`));
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
