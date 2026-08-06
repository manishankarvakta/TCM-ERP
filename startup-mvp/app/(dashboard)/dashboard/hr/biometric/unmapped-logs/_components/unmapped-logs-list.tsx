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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FiSearch, FiCopy, FiMoreVertical, FiCheckCircle, FiEye, FiXCircle, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { markUnmappedLogIgnored, bulkMarkUnmappedLogsIgnored } from "../_actions/unmapped-logs.action";
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
  initialPin: string;
  uniquePins: string[];
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
  initialPin,
  uniquePins = [],
  employees,
  devices,
  permissions,
}: UnmappedLogsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [pin, setPin] = useState(initialPin);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
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

  const handlePinChange = (value: string) => {
    setPin(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("pin", value);
    else params.delete("pin");
    params.set("page", "1");
    router.push(`/dashboard/hr/biometric/unmapped-logs?${params.toString()}`);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLogIds(initialLogs.map(log => log.id));
    } else {
      setSelectedLogIds([]);
    }
  };

  const handleSelectLog = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedLogIds(prev => [...prev, id]);
    } else {
      setSelectedLogIds(prev => prev.filter(i => i !== id));
    }
  };

  const [isBulkIgnoreOpen, setIsBulkIgnoreOpen] = useState(false);
  const [ignoreLogId, setIgnoreLogId] = useState<string | null>(null);

  const handleBulkIgnore = () => {
    if (selectedLogIds.length === 0) return;
    setIsBulkIgnoreOpen(true);
  };

  const confirmBulkIgnore = () => {
    setIsBulkIgnoreOpen(false);
    startTransition(async () => {
      const res = await bulkMarkUnmappedLogsIgnored(selectedLogIds);
      if (res.success) {
        toast({ title: "Success", description: `${selectedLogIds.length} logs ignored successfully.` });
        setSelectedLogIds([]);
        router.refresh();
      } else {
        toast({ title: "Error", description: res.error || "Failed to bulk ignore logs", variant: "destructive" });
      }
    });
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/dashboard/hr/biometric/unmapped-logs?${params.toString()}`);
  };

  const handleLimitChange = (newLimit: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", newLimit.toString());
    params.set("page", "1");
    router.push(`/dashboard/hr/biometric/unmapped-logs?${params.toString()}`);
  };

  const renderLimitSelector = () => {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Rows per page:</span>
        <Select
          value={String(initialPagination.limit)}
          onValueChange={(val) => handleLimitChange(Number(val))}
        >
          <SelectTrigger className="w-[70px] h-8 text-xs">
            <SelectValue placeholder={String(initialPagination.limit)} />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 50, 100].map((opt) => (
              <SelectItem key={opt} value={String(opt)}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  const renderPaginationButtons = () => {
    if (initialPagination.totalPages <= 1) return null;
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(initialPagination.page - 1)}
          disabled={initialPagination.page === 1}
        >
          <FiChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        
        <div className="flex items-center gap-1">
          {(() => {
            const pages: (number | string)[] = [];
            const windowSize = 2;
            const currentPage = initialPagination.page;
            const totalPages = initialPagination.totalPages;
            
            pages.push(1);
            const startRange = Math.max(2, currentPage - windowSize);
            const endRange = Math.min(totalPages - 1, currentPage + windowSize);
            
            if (startRange > 2) {
              pages.push("...");
            }
            
            for (let i = startRange; i <= endRange; i++) {
              pages.push(i);
            }
            
            if (endRange < totalPages - 1) {
              pages.push("...");
            }
            
            if (totalPages > 1) {
              pages.push(totalPages);
            }
            
            return pages.map((p, idx) => {
              if (p === "...") {
                return (
                  <span key={`dots-${idx}`} className="px-1 text-sm text-muted-foreground">
                    ...
                  </span>
                );
              }
              const isCurrent = p === currentPage;
              return (
                <Button
                  key={`page-${p}`}
                  variant={isCurrent ? "default" : "outline"}
                  size="sm"
                  className="h-8 w-8 p-0 text-xs"
                  onClick={() => handlePageChange(p as number)}
                >
                  {p}
                </Button>
              );
            });
          })()}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(initialPagination.page + 1)}
          disabled={initialPagination.page === initialPagination.totalPages}
        >
          Next
          <FiChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    );
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

  const handleIgnore = (id: string) => {
    setIgnoreLogId(id);
  };

  const confirmSingleIgnore = () => {
    if (!ignoreLogId) return;
    const id = ignoreLogId;
    setIgnoreLogId(null);
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 w-full">
          <div className="relative w-full max-w-sm">
            <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search serial, user ID, reason..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-full max-w-xs">
            <Select value={pin || "all"} onValueChange={(val) => handlePinChange(val === "all" ? "" : val)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Device PINs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Device PINs</SelectItem>
                {uniquePins.map((p) => (
                  <SelectItem key={p} value={String(p)}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {selectedLogIds.length > 0 && (
        <div className="flex items-center gap-4 bg-muted p-3 rounded-md border border-border">
          <span className="text-sm font-medium text-muted-foreground">
            {selectedLogIds.length} item(s) selected
          </span>
          {permissions?.manage && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkIgnore}
              disabled={isPending}
            >
              Bulk Mark Ignored
            </Button>
          )}
        </div>
      )}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={initialLogs.length > 0 && selectedLogIds.length === initialLogs.length}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                />
              </TableHead>
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
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <FiSearch className="mb-2 h-8 w-8" />
                    <p>No unknown punches found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              initialLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedLogIds.includes(log.id)}
                      onCheckedChange={(checked) => handleSelectLog(log.id, !!checked)}
                    />
                  </TableCell>
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

      {(initialPagination.totalPages > 1 || true) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2">
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Showing {initialPagination.total === 0 ? 0 : (initialPagination.page - 1) * initialPagination.limit + 1} to{" "}
              {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)} of {initialPagination.total} entries
            </p>
            {renderLimitSelector()}
          </div>
          {renderPaginationButtons()}
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

      {/* Bulk Ignore Confirmation Modal */}
      <AlertDialog open={isBulkIgnoreOpen} onOpenChange={setIsBulkIgnoreOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk Ignore Unknown Punches</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to ignore the {selectedLogIds.length} selected unknown punches?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsBulkIgnoreOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkIgnore}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single Ignore Confirmation Modal */}
      <AlertDialog open={!!ignoreLogId} onOpenChange={(open) => !open && setIgnoreLogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ignore Unmapped Log</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to ignore this log? It won't be processed for attendance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIgnoreLogId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSingleIgnore}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
