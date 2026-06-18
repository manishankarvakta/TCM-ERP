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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FiSearch, FiCopy, FiMoreVertical, FiCheckCircle, FiEye, FiXCircle } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { markUnmappedLogIgnored } from "../_actions/unmapped-logs.action";
import { ResolveUnmappedModal } from "./resolve-unmapped-modal";

function StatusBadge({ status }: { status: string }) {
  if (status === "RESOLVED") {
    return <Badge variant="default" className="bg-green-600">RESOLVED</Badge>;
  }
  if (status === "IGNORED") {
    return <Badge variant="secondary">IGNORED</Badge>;
  }
  return <Badge variant="outline" className="text-orange-600 border-orange-600">UNRESOLVED</Badge>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UnmappedLogsListClientProps {
  initialLogs: any[];
  initialPagination: Pagination;
  initialSearch: string;
  employees: any[];
  devices: any[];
  permissions?: {
    view: boolean;
    manage: boolean;
  };
}

export default function UnmappedLogsListClient({
  initialLogs = [],
  initialPagination,
  initialSearch,
  employees,
  devices,
  permissions,
}: UnmappedLogsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedLogForResolve, setSelectedLogForResolve] = useState<any>(null);

  const [isRawModalOpen, setIsRawModalOpen] = useState(false);
  const [selectedRawData, setSelectedRawData] = useState<string | null>(null);

  const handleSearch = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("search", value);
    else params.delete("search");
    params.set("page", "1");
    router.push(`/dashboard/hr/biometric/unmapped-logs?${params.toString()}`);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const openResolveModal = (log: any) => {
    setSelectedLogForResolve(log);
    setIsResolveModalOpen(true);
  };

  const viewRawPayload = (rawData: string | null) => {
    if (!rawData) return;
    setSelectedRawData(rawData);
    setIsRawModalOpen(true);
  };

  const handleIgnore = async (id: string) => {
    if (!window.confirm("Are you sure you want to ignore this log? It won't be processed for attendance.")) return;
    startTransition(async () => {
      const result = await markUnmappedLogIgnored(id);
      if (result.success) {
        toast({ title: "Success", description: "Log marked as ignored." });
      } else {
        toast({ title: "Error", description: result.error || "Failed to ignore log", variant: "destructive" });
      }
    });
  };

  const onResolveSuccess = () => {
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search serial, user ID, reason..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Created At</TableHead>
              <TableHead>Punch Time</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Biometric ID / PIN</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <FiSearch className="mb-2 h-8 w-8" />
                    <p>No unknown punches found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              initialLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {log.punchTime ? format(new Date(log.punchTime), "MMM d, yyyy HH:mm:ss") : "N/A"}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{log.deviceName || "Unknown Device"}</div>
                    <div className="text-xs text-muted-foreground">{log.deviceSerialNumber || "N/A"}</div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{log.deviceUserId || "N/A"}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs" title={log.reason}>
                    {log.reason}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={log.status} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
                          <span className="sr-only">Open menu</span>
                          <FiMoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {permissions?.manage && log.status !== "RESOLVED" && log.status !== "IGNORED" && (
                          <>
                            <DropdownMenuItem onClick={() => openResolveModal(log)}>
                              <FiCheckCircle className="mr-2 h-4 w-4 text-green-600" />
                              Resolve Log
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleIgnore(log.id)}>
                              <FiXCircle className="mr-2 h-4 w-4" />
                              Mark Ignored
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem onClick={() => copyToClipboard(log.deviceUserId, "User ID")}>
                          <FiCopy className="mr-2 h-4 w-4" />
                          Copy Biometric ID / PIN
                        </DropdownMenuItem>
                        {log.deviceSerialNumber && (
                          <DropdownMenuItem onClick={() => copyToClipboard(log.deviceSerialNumber, "Serial")}>
                            <FiCopy className="mr-2 h-4 w-4" />
                            Copy Serial
                          </DropdownMenuItem>
                        )}
                        {log.rawData && (
                          <DropdownMenuItem onClick={() => viewRawPayload(log.rawData)}>
                            <FiEye className="mr-2 h-4 w-4" />
                            View Technical Data
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
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
                router.push(`/dashboard/hr/biometric/unmapped-logs?${params.toString()}`);
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
                router.push(`/dashboard/hr/biometric/unmapped-logs?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      <ResolveUnmappedModal
        isOpen={isResolveModalOpen}
        setIsOpen={setIsResolveModalOpen}
        unmappedLog={selectedLogForResolve}
        employees={employees}
        devices={devices}
        onSuccess={onResolveSuccess}
      />

      {/* Raw Data Modal */}
      <Dialog open={isRawModalOpen} onOpenChange={setIsRawModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Technical Data</DialogTitle>
            <DialogDescription>
              Original text received from the physical hardware that couldn't be automatically mapped.
            </DialogDescription>
          </DialogHeader>
          {selectedRawData && (
            <div className="relative mt-2">
              <Button 
                size="icon" 
                variant="secondary" 
                className="absolute top-2 right-2 h-8 w-8"
                onClick={() => copyToClipboard(selectedRawData, "Raw Data")}
              >
                <FiCopy className="h-4 w-4" />
              </Button>
              <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                {selectedRawData}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
