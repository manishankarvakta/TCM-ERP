"use client";

import React, { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FiCalendar, FiPlay, FiRefreshCw } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import { bulkGenerateRoster } from "../_actions/roster.action";

interface RosterGeneratorDialogProps {
  departments: { id: string; name: string }[];
  shifts: { id: string; name: string; startTime: string; endTime: string }[];
  currentMonth: string; // YYYY-MM
  onSuccess: () => void;
}

export default function RosterGeneratorDialog({
  departments,
  shifts,
  currentMonth,
  onSuccess,
}: RosterGeneratorDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [startDateStr, setStartDateStr] = useState(`${currentMonth}-01`);
  const [endDateStr, setEndDateStr] = useState(() => {
    const [y, m] = currentMonth.split("-").map(Number);
    const days = new Date(y, m, 0).getDate();
    return `${currentMonth}-${days < 10 ? "0" + days : days}`;
  });

  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(
    shifts.length > 0 ? shifts[0].id : null
  );

  // Day indices: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  // Default Bangladesh weekend: Friday (5)
  const [offDaysOfWeek, setOffDaysOfWeek] = useState<number[]>([5]);

  const toggleOffDay = (dayIndex: number) => {
    if (offDaysOfWeek.includes(dayIndex)) {
      setOffDaysOfWeek(offDaysOfWeek.filter((d) => d !== dayIndex));
    } else {
      setOffDaysOfWeek([...offDaysOfWeek, dayIndex]);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDateStr || !endDateStr) {
      toast({ title: "Validation Error", description: "Start Date and End Date are required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await bulkGenerateRoster({
        departmentFilter,
        startDateStr,
        endDateStr,
        shiftId: selectedShiftId === "OFF" ? null : selectedShiftId,
        offDaysOfWeek,
      });

      if (res.success) {
        toast({
          title: "Roster Generated",
          description: `Successfully scheduled ${res.count} roster entries.`,
        });
        setOpen(false);
        onSuccess();
      } else {
        toast({ title: "Error", description: res.error || "Failed to generate roster", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "An error occurred", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const shiftOptions = [
    ...shifts.map((s) => ({
      label: `${s.name} (${s.startTime} - ${s.endTime})`,
      value: s.id,
    })),
    { label: "OFF / Weekly Holiday", value: "OFF" },
  ];

  const weekDayLabels = [
    { label: "Sun", index: 0 },
    { label: "Mon", index: 1 },
    { label: "Tue", index: 2 },
    { label: "Wed", index: 3 },
    { label: "Thu", index: 4 },
    { label: "Fri", index: 5 },
    { label: "Sat", index: 6 },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 shadow-xs">
          <FiRefreshCw className="h-3.5 w-3.5" />
          Generate Roster
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleGenerate}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FiCalendar className="text-primary h-5 w-5" />
              Bulk Roster Generator
            </DialogTitle>
            <DialogDescription>
              Schedule shifts for employees across a date range with automatic off-day rotation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Target Department */}
            <div className="space-y-2">
              <Label>Target Department</Label>
              <SearchableSelect
                options={[
                  { label: "All Departments", value: "all" },
                  ...departments.map((d) => ({ label: d.name, value: d.name })),
                ]}
                value={departmentFilter}
                onValueChange={(val) => setDepartmentFilter(val || "all")}
                placeholder="Select Department"
                searchPlaceholder="Search department..."
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDateStr}
                  onChange={(e) => setStartDateStr(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDateStr}
                  onChange={(e) => setEndDateStr(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Default Shift */}
            <div className="space-y-2">
              <Label>Working Shift Assignment</Label>
              <SearchableSelect
                options={shiftOptions}
                value={selectedShiftId}
                onValueChange={(val) => setSelectedShiftId(val)}
                placeholder="Select Working Shift"
                searchPlaceholder="Search shifts..."
              />
            </div>

            {/* Weekly Off-Days Checkboxes */}
            <div className="space-y-2 pt-1">
              <Label className="text-xs font-semibold">Weekly Off-Days (Automatic OFF assignment)</Label>
              <div className="flex flex-wrap gap-3 pt-1">
                {weekDayLabels.map((d) => (
                  <label key={d.index} className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                    <Checkbox
                      checked={offDaysOfWeek.includes(d.index)}
                      onCheckedChange={() => toggleOffDay(d.index)}
                    />
                    <span>{d.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              <FiPlay className="h-4 w-4" />
              {loading ? "Generating..." : "Generate Roster"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
