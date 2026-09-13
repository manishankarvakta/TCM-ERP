"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FiCalendar, FiPlay } from "react-icons/fi";
import { bulkGenerateRoster } from "../_actions/roster.action";
import { toast } from "sonner";

interface ShiftOption {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

interface DepartmentOption {
  id: string;
  name: string;
}

interface RosterGeneratorDialogProps {
  shifts: ShiftOption[];
  departments: DepartmentOption[];
  currentMonthStr: string;
  onSuccess?: () => void;
}

const DAYS_OF_WEEK = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

export function RosterGeneratorDialog({
  shifts,
  departments,
  currentMonthStr,
  onSuccess,
}: RosterGeneratorDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Default start & end date to current month bounds
  const [year, month] = currentMonthStr.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const defaultStart = `${currentMonthStr}-01`;
  const defaultEnd = `${currentMonthStr}-${String(daysInMonth).padStart(2, "0")}`;

  const [startDateStr, setStartDateStr] = useState(defaultStart);
  const [endDateStr, setEndDateStr] = useState(defaultEnd);
  const [selectedShiftId, setSelectedShiftId] = useState<string>("default");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [offDays, setOffDays] = useState<number[]>([5]); // Default Friday (5) off

  const handleToggleOffDay = (dayVal: number) => {
    setOffDays((prev) =>
      prev.includes(dayVal)
        ? prev.filter((d) => d !== dayVal)
        : [...prev, dayVal]
    );
  };

  const handleGenerate = async () => {
    if (!startDateStr || !endDateStr) {
      toast.error("Please select a valid date range");
      return;
    }

    try {
      setLoading(true);
      const shiftId = selectedShiftId === "default" ? null : selectedShiftId;

      const res = await bulkGenerateRoster({
        startDateStr,
        endDateStr,
        shiftId,
        departmentFilter,
        offDaysOfWeek: offDays,
      });

      if (res.success) {
        toast.success(`Successfully generated ${res.count || 0} roster entries`);
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error(res.error || "Failed to generate roster");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
          <FiCalendar className="w-4 h-4" />
          Bulk Roster Generator
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <FiCalendar className="w-5 h-5 text-emerald-600" />
            Bulk Roster Schedule Generator
          </DialogTitle>
          <DialogDescription>
            Generate shift assignments across a date range with recurring off-days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Department Filter */}
          <div className="space-y-1.5">
            <Label>Target Department</Label>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDateStr}
                onChange={(e) => setEndDateStr(e.target.value)}
              />
            </div>
          </div>

          {/* Shift Selection */}
          <div className="space-y-1.5">
            <Label>Assigned Shift</Label>
            <Select value={selectedShiftId} onValueChange={setSelectedShiftId}>
              <SelectTrigger>
                <SelectValue placeholder="Select shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  Employee Default Shift (Revert)
                </SelectItem>
                {shifts.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.startTime} - {s.endTime})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Weekly Off Days */}
          <div className="space-y-2">
            <Label>Recurring Weekly Off Days</Label>
            <div className="flex flex-wrap gap-3 p-3 border rounded-md bg-muted/30">
              {DAYS_OF_WEEK.map((day) => (
                <label
                  key={day.value}
                  className="flex items-center gap-1.5 text-sm cursor-pointer select-none"
                >
                  <Checkbox
                    checked={offDays.includes(day.value)}
                    onCheckedChange={() => handleToggleOffDay(day.value)}
                  />
                  <span>{day.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <FiPlay className="w-4 h-4" />
            {loading ? "Generating..." : "Generate Roster"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
