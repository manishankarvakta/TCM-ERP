"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FiSearch,
  FiPrinter,
  FiMoreVertical,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiFileText,
  FiEye,
} from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import {
  getAppointmentLetters,
  updateAppointmentLetterStatus,
  deleteAppointmentLetter,
} from "../_actions/appointment-letter.action";
import { AppointmentLetterPrintModal } from "./appointment-letter-print-modal";
import { CreateAppointmentLetterDialog } from "./create-appointment-letter-dialog";

export function AppointmentLetterList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [letters, setLetters] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);

  // Filters & State
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "ALL");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);

  // Print modal state
  const [printLetterId, setPrintLetterId] = useState<string | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  const fetchLetters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAppointmentLetters(page, 10, search, status);
      if (res.success && res.data) {
        setLetters(res.data);
        setPagination(res.pagination);
      } else {
        toast({
          title: "Error",
          description: res.error || "Failed to load appointment letters",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, status, toast]);

  useEffect(() => {
    fetchLetters();
  }, [fetchLetters]);

  const handleStatusChange = async (id: string, newStatus: any) => {
    try {
      const res = await updateAppointmentLetterStatus(id, newStatus);
      if (res.success) {
        toast({
          title: "Status Updated",
          description: res.message,
        });
        fetchLetters();
      } else {
        toast({
          title: "Error",
          description: res.error || "Failed to update status",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this appointment letter?")) return;
    try {
      const res = await deleteAppointmentLetter(id);
      if (res.success) {
        toast({
          title: "Deleted",
          description: res.message,
        });
        fetchLetters();
      } else {
        toast({
          title: "Error",
          description: res.error || "Failed to delete letter",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete letter",
        variant: "destructive",
      });
    }
  };

  const openPrintModal = (id: string) => {
    setPrintLetterId(id);
    setPrintModalOpen(true);
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "ACCEPTED":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700">ACCEPTED</Badge>;
      case "ISSUED":
        return <Badge className="bg-blue-600 hover:bg-blue-700">ISSUED</Badge>;
      case "DRAFT":
        return <Badge variant="outline">DRAFT</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">CANCELLED</Badge>;
      default:
        return <Badge variant="secondary">{st}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by letter #, employee name, code, designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <CreateAppointmentLetterDialog
            onSuccess={(newId) => {
              fetchLetters();
              if (newId) openPrintModal(newId);
            }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        {["ALL", "ISSUED", "ACCEPTED", "DRAFT", "CANCELLED"].map((st) => (
          <Button
            key={st}
            variant={status === st ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setStatus(st);
              setPage(1);
            }}
            className="text-xs capitalize"
          >
            {st.toLowerCase()}
          </Button>
        ))}
      </div>

      {/* Data Table */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Letter Ref</th>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Designation</th>
              <th className="px-4 py-3">Joining Date</th>
              <th className="px-4 py-3">Gross Salary</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading appointment letters...
                </td>
              </tr>
            ) : letters.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <FiFileText className="w-8 h-8 text-muted-foreground opacity-50" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      No appointment letters found
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Click &quot;Create Appointment Letter&quot; above to generate one.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              letters.map((letter) => (
                <tr key={letter.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">
                    {letter.letterNumber}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {letter.employee?.name || "N/A"}
                    </div>
                    {letter.employee?.employeeCode && (
                      <div className="text-xs text-muted-foreground font-mono">
                        {letter.employee.employeeCode}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div>{letter.designation}</div>
                    {letter.department && (
                      <div className="text-xs text-muted-foreground">{letter.department}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">{letter.joiningDate}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-xs">
                    BDT {Number(letter.grossSalary).toLocaleString("en-BD")}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(letter.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPrintModal(letter.id)}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <FiPrinter className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <FiMoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openPrintModal(letter.id)}>
                            <FiEye className="w-4 h-4 mr-2" />
                            <span>View / Print Letter</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(letter.id, "ACCEPTED")}
                          >
                            <FiCheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
                            <span>Mark as Accepted</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(letter.id, "CANCELLED")}
                          >
                            <FiXCircle className="w-4 h-4 mr-2 text-amber-600" />
                            <span>Mark as Cancelled</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(letter.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <FiTrash2 className="w-4 h-4 mr-2" />
                            <span>Delete Letter</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <div>
            Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} total items)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Print Modal Dialog */}
      <AppointmentLetterPrintModal
        letterId={printLetterId}
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
      />
    </div>
  );
}
