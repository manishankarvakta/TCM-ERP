"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { FiClock, FiSearch, FiCheckSquare, FiAlertCircle } from "react-icons/fi";
import { processBulkAttendance } from "../_actions/attendance.action";
import { getWarehouses } from "../../../master/warehouses/_actions/warehouse.action";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface AttendanceRecord {
  id: string;
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  workHours: any;
  otHours: any;
  status: string;
  isManual: boolean;
  notes: string | null;
  employee: {
    id: string;
    name: string;
    employeeCode: string | null;
    designation: string | null;
  };
  shift: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  } | null;
}

interface AttendanceListClientProps {
  initialAttendances: AttendanceRecord[];
  selectedDate: string;
  selectedWarehouseId: string;
  permissions?: {
    view: boolean;
    edit: boolean;
  };
}

export default function AttendanceListClient({
  initialAttendances = [],
  selectedDate,
  selectedWarehouseId,
  permissions,
}: AttendanceListClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(selectedDate);
  const [warehouseId, setWarehouseId] = useState(selectedWarehouseId);
  const [warehouses, setWarehouses] = useState<{id: string, name: string}[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchWarehouses() {
      const res = await getWarehouses(1, 100);
      if (res.success && res.warehouses) {
        setWarehouses(res.warehouses);
      }
    }
    fetchWarehouses();
  }, []);

  const handleFilterChange = (newDate: string, newWarehouseId: string) => {
    setDate(newDate);
    setWarehouseId(newWarehouseId);
    
    const params = new URLSearchParams();
    if (newDate) params.set("date", newDate);
    if (newWarehouseId && newWarehouseId !== "all") params.set("warehouseId", newWarehouseId);
    
    router.push(`/dashboard/hr/attendance?${params.toString()}`);
  };

  const handleProcessBulk = () => {
    startTransition(async () => {
      const result = await processBulkAttendance(date, warehouseId === "all" ? undefined : warehouseId);
      if (result.success) {
        toast({
          title: "Success",
          description: `Processed attendance for ${result.count} un-punched employees as Absent.`,
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to process bulk attendance",
          variant: "destructive",
        });
      }
    });
  };

  const filteredAttendances = initialAttendances.filter(a => 
    a.employee.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.employee.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PRESENT":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all font-medium rounded-full px-2.5 py-0.5">Present</Badge>;
      case "LATE":
        return <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20 transition-all font-medium rounded-full px-2.5 py-0.5">Late</Badge>;
      case "HALF_DAY":
        return <Badge className="bg-orange-500/10 text-orange-600 border border-orange-500/20 hover:bg-orange-500/20 transition-all font-medium rounded-full px-2.5 py-0.5">Half Day</Badge>;
      case "ABSENT":
        return <Badge className="bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20 transition-all font-medium rounded-full px-2.5 py-0.5">Absent</Badge>;
      default:
        return <Badge variant="outline" className="rounded-full px-2.5 py-0.5">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center p-5 bg-card/50 backdrop-blur-sm border border-muted-foreground/10 rounded-xl shadow-sm">
        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/80">Date</label>
            <Input 
              type="date" 
              value={date} 
              onChange={(e) => handleFilterChange(e.target.value, warehouseId)}
              className="bg-background/50 hover:bg-background/80 focus:bg-background border-muted-foreground/20 focus:border-primary transition-all duration-200"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/80">Search Employee</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                placeholder="Name or Code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50 hover:bg-background/80 focus:bg-background border-muted-foreground/20 focus:border-primary transition-all duration-200"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/80">Branch</label>
            <Select 
              value={warehouseId || "all"} 
              onValueChange={(val) => handleFilterChange(date, val)}
            >
              <SelectTrigger className="bg-background/50 hover:bg-background/80 focus:bg-background border-muted-foreground/20 focus:border-primary transition-all duration-200">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {warehouses.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {permissions?.edit && (
          <div className="flex-shrink-0 self-end w-full md:w-auto">
            <Button 
              variant="secondary" 
              onClick={handleProcessBulk}
              disabled={isPending}
              className="w-full md:w-auto bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary transition-all font-medium"
            >
              <FiCheckSquare className="mr-2 h-4 w-4" />
              {isPending ? "Processing..." : "Process Un-punched as Absent"}
            </Button>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="border border-muted-foreground/10 rounded-xl overflow-hidden shadow-sm bg-card/30">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="font-semibold text-muted-foreground">Employee</TableHead>
              <TableHead className="font-semibold text-muted-foreground">Shift</TableHead>
              <TableHead className="font-semibold text-muted-foreground">Check In</TableHead>
              <TableHead className="font-semibold text-muted-foreground">Check Out</TableHead>
              <TableHead className="font-semibold text-muted-foreground text-right">Hours (WH/OT)</TableHead>
              <TableHead className="font-semibold text-muted-foreground">Status</TableHead>
              {permissions?.edit && <TableHead className="font-semibold text-muted-foreground text-right">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAttendances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No attendance records found for this date.
                </TableCell>
              </TableRow>
            ) : (
              filteredAttendances.map((att) => (
                <TableRow key={att.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <div>
                      <div className="font-semibold text-foreground/90">{att.employee.name}</div>
                      <div className="text-xs text-muted-foreground/75 font-medium mt-0.5">
                        {att.employee.employeeCode || "N/A"} • {att.employee.designation || "No Desig."}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {att.shift ? (
                      <div className="text-sm">
                        <div className="font-medium text-foreground/80">{att.shift.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {att.shift.startTime} - {att.shift.endTime}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/75 font-medium">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {att.checkIn ? (
                      <div className="flex items-center gap-1.5 font-medium text-foreground/80">
                        <FiClock className="h-3.5 w-3.5 text-emerald-500" />
                        <span>{format(new Date(att.checkIn), "hh:mm a")}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50 font-medium">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {att.checkOut ? (
                      <div className="flex items-center gap-1.5 font-medium text-foreground/80">
                        <FiClock className="h-3.5 w-3.5 text-amber-500" />
                        <span>{format(new Date(att.checkOut), "hh:mm a")}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50 font-medium">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-semibold text-foreground/90">{Number(att.workHours).toFixed(1)}h</div>
                    {Number(att.otHours) > 0 && (
                      <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                        +{Number(att.otHours).toFixed(1)}h OT
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(att.status)}
                      {att.isManual && (
                        <FiAlertCircle className="h-3.5 w-3.5 text-muted-foreground" title="Manual Entry" />
                      )}
                    </div>
                  </TableCell>
                  {permissions?.edit && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild className="hover:bg-muted font-medium">
                        <Link href={`/dashboard/hr/attendance/manual-punch?employeeId=${att.employee.id}&date=${date}`}>
                          Edit
                        </Link>
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
