"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { FiAlertCircle, FiCalendar, FiMapPin, FiClock } from "react-icons/fi";
import { createSystemEvent, updateSystemEvent } from "@/app/actions/system/events";
import { toast } from "sonner";
import { format } from "date-fns";
import { SystemEntityType } from "@/lib/system/types";

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  eventType: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  allDay: z.boolean(),
  attendees: z.array(z.string()),
  location: z.string().optional(),
  description: z.string().optional(),
  reminder: z.string().optional(),
  status: z.string().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

interface SystemEventFormProps {
  entityType: SystemEntityType;
  entityId: string;
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
  users?: { id: string; name: string | null; email: string }[];
}

export default function SystemEventForm({
  entityType,
  entityId,
  initialData,
  onSuccess,
  onCancel,
  users = [],
}: SystemEventFormProps) {
  const [error, setError] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: initialData?.title || initialData?.subject || "",
      eventType: (initialData?.eventType || initialData?.metadata?.eventType || "MEETING").toString().toUpperCase(),
      startDate: (initialData?.startTime || initialData?.dueDate)
        ? format(new Date(initialData.startTime || initialData.dueDate), "yyyy-MM-dd'T'HH:mm")
        : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      endDate: (initialData?.endTime || initialData?.completedAt)
        ? format(new Date(initialData.endTime || initialData.completedAt), "yyyy-MM-dd'T'HH:mm")
        : format(new Date(Date.now() + 3600000), "yyyy-MM-dd'T'HH:mm"),
      allDay: initialData?.allDay || initialData?.metadata?.allDay || false,
      attendees: initialData?.attendees || initialData?.metadata?.attendees || [],
      location: initialData?.location || initialData?.metadata?.location || "",
      description: initialData?.description || "",
      reminder: (initialData?.reminder || initialData?.metadata?.reminder || "15_MIN").toString().toUpperCase(),
      status: (initialData?.status || "TODO").toString().toUpperCase(),
    },
  });

  // Keep form in sync with initialData (crucial for sheets that stay mounted)
  useEffect(() => {
    if (initialData) {
      const rawType = initialData.eventType || initialData.metadata?.eventType;
      const normalizedType = rawType ? rawType.toString().toUpperCase() : "MEETING";

      const rawReminder = initialData.reminder || initialData.metadata?.reminder;
      const normalizedReminder = rawReminder ? rawReminder.toString().toUpperCase() : "15_MIN";

      const rawStatus = initialData.status?.toString().toUpperCase() || "TODO";

      reset({
        title: initialData.title || initialData.subject || "",
        eventType: normalizedType,
        startDate: (initialData.startTime || initialData.dueDate)
          ? format(new Date(initialData.startTime || initialData.dueDate), "yyyy-MM-dd'T'HH:mm")
          : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        endDate: (initialData.endTime || initialData.completedAt)
          ? format(new Date(initialData.endTime || initialData.completedAt), "yyyy-MM-dd'T'HH:mm")
          : format(new Date(Date.now() + 3600000), "yyyy-MM-dd'T'HH:mm"),
        allDay: initialData.allDay || initialData.metadata?.allDay || false,
        attendees: initialData.attendees || initialData.metadata?.attendees || [],
        location: initialData.location || initialData.metadata?.location || "",
        description: initialData.description || "",
        reminder: normalizedReminder,
        status: rawStatus,
      });
    }
  }, [initialData, reset]);

  const attendeeOptions: MultiSelectOption[] = users.map((u) => ({
    label: u.name || u.email,
    value: u.id,
  }));

  const onSubmit = (data: EventFormData) => {
    setError("");

    startTransition(async () => {
      try {
        const payload = {
          ...data,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
        };

        if (initialData?.id) {
          const result = await updateSystemEvent(initialData.id, payload);
          if (!result.success) throw new Error("Failed to update event");
          toast.success("Event updated successfully");
        } else {
          const result = await createSystemEvent({
            ...payload,
            entityType,
            entityId,
          });
          if (!result.success) throw new Error("Failed to create event");
          toast.success("Event scheduled successfully");
        }

        onSuccess();
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
          <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Title */}
      <div className="space-y-1">
        <Label htmlFor="title" className="text-sm font-medium">
          Event Title
        </Label>
        <Input
          id="title"
          {...register("title")}
          disabled={isPending}
          placeholder="Add title"
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      {/* 2. Type & Location */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-sm font-medium">Type</Label>
          <Controller
            name="eventType"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEETING">Meeting</SelectItem>
                  <SelectItem value="CALL">Call</SelectItem>
                  <SelectItem value="TASK">Task</SelectItem>
                  <SelectItem value="DEADLINE">Deadline</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  {/* <SelectItem value="LUNCH">Lunch</SelectItem> */}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="location" className="text-sm font-medium">
            Location
          </Label>
          <div className="relative group">
            <FiMapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
            <Input
              id="location"
              {...register("location")}
              disabled={isPending}
              placeholder="Add location"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* 3. Description */}
      <div className="space-y-1">
        <Label htmlFor="description" className="text-sm font-medium">
          Details
        </Label>
        <Textarea
          id="description"
          {...register("description")}
          disabled={isPending}
          placeholder="Add description or notes..."
          className="resize-none min-h-[80px] leading-relaxed"
        />
      </div>

      {/* 4. Time & All Day */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Time & Duration
            </Label>
            <div className="flex items-center gap-2">
                <Label htmlFor="all-day" className="text-xs font-medium text-muted-foreground">
                All Day
                </Label>
                <Controller
                name="allDay"
                control={control}
                render={({ field }) => (
                    <Switch
                    id="all-day"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isPending}
                    className="scale-75 origin-right"
                    />
                )}
                />
            </div>
        </div>
        <div className="rounded-lg border bg-muted/20 p-3 transition-all hover:bg-muted/30 hover:border-border">
          <div className="grid grid-cols-2 gap-2 items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <FiClock className="h-3.5 w-3.5 text-primary" />
                <Label htmlFor="startDate" className="text-xs font-medium text-muted-foreground">
                  Starts
                </Label>
              </div>
              <Input
                id="startDate"
                type="datetime-local"
                {...register("startDate")}
                disabled={isPending}
                className="bg-background"
              />
              {errors.startDate && (
                <p className="text-xs text-destructive">{errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <FiClock className="h-3.5 w-3.5 text-muted-foreground" />
                <Label htmlFor="endDate" className="text-xs font-medium text-muted-foreground">
                  Ends
                </Label>
              </div>
              <Input
                id="endDate"
                type="datetime-local"
                {...register("endDate")}
                disabled={isPending}
                className="bg-background"
              />
              {errors.endDate && (
                <p className="text-xs text-destructive">{errors.endDate.message}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Participants */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">Participants</Label>
        <Controller
          name="attendees"
          control={control}
          render={({ field }) => (
            <MultiSelect
              options={attendeeOptions}
              value={field.value}
              onValueChange={field.onChange}
              placeholder="Select participants..."
              disabled={isPending}
              maxCount={3}
            />
          )}
        />
      </div>

      {/* 6. Reminder & Status */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-sm font-medium">Reminder</Label>
          <Controller
            name="reminder"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Set reminder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="5_MIN">5 minutes before</SelectItem>
                  <SelectItem value="10_MIN">10 minutes before</SelectItem>
                  <SelectItem value="15_MIN">15 minutes before</SelectItem>
                  <SelectItem value="30_MIN">30 minutes before</SelectItem>
                  <SelectItem value="1_HOUR">1 hour before</SelectItem>
                  <SelectItem value="1_DAY">1 day before</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-sm font-medium">Status</Label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">To Do</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                  <SelectItem value="CANCELED">Canceled</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {/* ACTION AREA */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} className="gap-2 min-w-[140px] shadow-sm">
          {isPending ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {initialData?.id ? "Updating..." : "Scheduling..."}
            </>
          ) : (
            <>
              <FiCalendar className="h-4 w-4" />
              {initialData?.id ? "Update Event" : "Schedule Event"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

