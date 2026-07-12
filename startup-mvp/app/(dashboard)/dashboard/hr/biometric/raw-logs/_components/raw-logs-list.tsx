"use client";

import { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FiSearch, FiEye, FiCopy, FiMoreVertical } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { getBiometricRawLogById } from "../_actions/raw-logs.action";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "PENDING":
      return <Badge variant="secondary">PENDING</Badge>;
    case "PROCESSED":
    case "SUCCESS":
      return <Badge variant="default" className="bg-green-600">PROCESSED</Badge>;
    case "ERROR":
    case "FAILED":
      return <Badge variant="destructive">ERROR</Badge>;
    case "UNMAPPED":
    case "PARTIAL":
      return <Badge variant="outline" className="text-orange-600 border-orange-600">UNMAPPED</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface RawLogsListClientProps {
  initialLogs: any[];
  initialPagination: Pagination;
  initialSearch: string;
  initialSource: string;
}

export default function RawLogsListClient({
  initialLogs = [],
  initialPagination,
  initialSearch,
  initialSource,
}: RawLogsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isLoadingLog, setIsLoadingLog] = useState(false);

  const handleSearch = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("search", value);
    else params.delete("search");
    params.set("page", "1");
    router.push(`/dashboard/hr/biometric/raw-logs?${params.toString()}`);
  };

  const handleSourceChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set("source", value);
    else params.delete("source");
    params.set("page", "1");
    router.push(`/dashboard/hr/biometric/raw-logs?${params.toString()}`);
  };

  const viewRawPayload = async (id: string, metadata: any) => {
    setIsLoadingLog(true);
    const result = await getBiometricRawLogById(id);
    setIsLoadingLog(false);

    if (result.success && result.log) {
      setSelectedLog({ ...result.log, ...metadata });
      setIsModalOpen(true);
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to load payload",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Payload copied to clipboard",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search serial, user ID..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={initialSource} onValueChange={handleSourceChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent className="max-h-[250px]">
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="ADMS">ADMS</SelectItem>
              <SelectItem value="BRIDGE">BRIDGE</SelectItem>
            </SelectContent>
          </Select>
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
              <TableHead>Source</TableHead>
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
                    <p>No diagnostic data found.</p>
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
                    <div className="font-medium">{log.deviceName || "Unknown"}</div>
                    <div className="text-xs text-muted-foreground">{log.deviceSerialNumber}</div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{log.deviceUserId || "N/A"}</TableCell>
                  <TableCell>{log.source}</TableCell>
                  <TableCell>
                    <StatusBadge status={log.syncStatus} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoadingLog}>
                          <span className="sr-only">Open menu</span>
                          <FiMoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => viewRawPayload(log.id, { deviceName: log.deviceName })}>
                          <FiEye className="mr-2 h-4 w-4" />
                          View Technical Data
                        </DropdownMenuItem>
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
                router.push(`/dashboard/hr/biometric/raw-logs?${params.toString()}`);
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
                router.push(`/dashboard/hr/biometric/raw-logs?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Raw Payload Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Technical Data Details</DialogTitle>
            <DialogDescription>
              Original unmodified text block received from the physical hardware.
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="font-semibold text-muted-foreground">Device:</span> {selectedLog.deviceName || "Unknown"}</div>
                <div><span className="font-semibold text-muted-foreground">Serial:</span> {selectedLog.deviceSerialNumber || "N/A"}</div>
                <div><span className="font-semibold text-muted-foreground">Source:</span> {selectedLog.source}</div>
                <div><span className="font-semibold text-muted-foreground">Status:</span> <StatusBadge status={selectedLog.syncStatus} /></div>
                <div><span className="font-semibold text-muted-foreground">Created At:</span> {format(new Date(selectedLog.createdAt), "MMM d, HH:mm:ss")}</div>
                <div><span className="font-semibold text-muted-foreground">Punch Time:</span> {selectedLog.punchTime ? format(new Date(selectedLog.punchTime), "MMM d, HH:mm:ss") : "N/A"}</div>
              </div>
              <div className="relative">
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => copyToClipboard(selectedLog.rawData)}
                >
                  <FiCopy className="h-4 w-4" />
                </Button>
                <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                  {selectedLog.rawData}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
