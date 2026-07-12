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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FiSearch, FiCopy, FiEye } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "PENDING":
      return <Badge variant="secondary">PENDING</Badge>;
    case "SUCCESS":
    case "PROCESSED":
      return <Badge variant="default" className="bg-green-600">SUCCESS</Badge>;
    case "FAILED":
    case "ERROR":
      return <Badge variant="destructive">FAILED</Badge>;
    case "PARTIAL":
    case "UNMAPPED":
      return <Badge variant="outline" className="text-orange-600 border-orange-600">PARTIAL</Badge>;
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

interface SyncHistoryListClientProps {
  initialLogs: any[];
  initialPagination: Pagination;
  initialSearch: string;
  initialSource: string;
}

export default function SyncHistoryListClient({
  initialLogs = [],
  initialPagination,
  initialSearch,
  initialSource,
}: SyncHistoryListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedError, setSelectedError] = useState<string | null>(null);

  const handleSearch = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("search", value);
    else params.delete("search");
    params.set("page", "1");
    router.push(`/dashboard/hr/biometric/sync-history?${params.toString()}`);
  };

  const handleSourceChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set("source", value);
    else params.delete("source");
    params.set("page", "1");
    router.push(`/dashboard/hr/biometric/sync-history?${params.toString()}`);
  };

  const viewError = (msg: string | null) => {
    if (!msg) return;
    setSelectedError(msg);
    setIsModalOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Error message copied to clipboard",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search errors, devices..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={initialSource} onValueChange={handleSourceChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Vendor/Source" />
            </SelectTrigger>
            <SelectContent className="max-h-[250px]">
              <SelectItem value="all">All Vendors</SelectItem>
              <SelectItem value="ZKTeco">ZKTeco</SelectItem>
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
              <TableHead>Sync Time</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Processed</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <FiSearch className="mb-2 h-8 w-8" />
                    <p>No sync activity has been recorded yet.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              initialLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(log.syncTime || log.createdAt), "MMM d, yyyy HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    {log.device ? (
                      <>
                        <div className="font-medium">{log.device.name}</div>
                        <div className="text-xs text-muted-foreground">{log.device.serialNumber}</div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">All Devices / System</span>
                    )}
                  </TableCell>
                  <TableCell>{log.vendor}</TableCell>
                  <TableCell>
                    <StatusBadge status={log.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium">{log.recordsCount}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs">
                    {log.errorMessage || "-"}
                  </TableCell>
                  <TableCell>
                    {log.errorMessage ? (
                       <Button variant="ghost" size="sm" onClick={() => viewError(log.errorMessage)}>
                         <FiEye className="h-4 w-4" />
                       </Button>
                    ) : (
                       <span className="text-muted-foreground text-xs">-</span>
                    )}
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
                router.push(`/dashboard/hr/biometric/sync-history?${params.toString()}`);
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
                router.push(`/dashboard/hr/biometric/sync-history?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Error Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Sync Issue Details</DialogTitle>
            <DialogDescription>
              Full error stack or issue generated during the synchronization attempt.
            </DialogDescription>
          </DialogHeader>
          {selectedError && (
            <div className="relative mt-2">
              <Button 
                size="icon" 
                variant="secondary" 
                className="absolute top-2 right-2 h-8 w-8"
                onClick={() => copyToClipboard(selectedError)}
              >
                <FiCopy className="h-4 w-4" />
              </Button>
              <pre className="bg-destructive/10 text-destructive p-4 rounded-md overflow-x-auto text-xs whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                {selectedError}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
