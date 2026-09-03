"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface EventFormProps {
  event?: any;
  entityType: string;
  entityId: string;
  onSuccess: () => void;
}

export function EventForm({ event, entityType, entityId, onSuccess }: EventFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: event?.title || "",
    description: event?.description || "",
    startTime: event?.startTime ? new Date(event.startTime).toISOString().slice(0, 16) : "",
    endTime: event?.endTime ? new Date(event.endTime).toISOString().slice(0, 16) : "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Please enter event title");
      return;
    }
    if (!formData.startTime) {
      toast.error("Please select start time");
      return;
    }

    setLoading(true);

    try {
// @ts-expect-error - Legacy compatibility
      const { createEvent, updateEvent } = await import("@/app/actions/system/event.action");

      const eventData = {
        ...formData,
        entityType,
        entityId,
        startTime: new Date(formData.startTime),
        endTime: formData.endTime ? new Date(formData.endTime) : undefined,
      };

      const result = event?.id
        ? await updateEvent(event.id, eventData)
        : await createEvent(eventData);

      if (result.success) {
        toast.success(event?.id ? "Event updated successfully" : "Event created successfully");
        router.refresh();
        onSuccess();
      } else {
        toast.error(result.error || "Failed to save event");
      }
    } catch (error) {
      console.error("Event form error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event?.id) return;
    if (!confirm("Are you sure you want to delete this event?")) return;

    setLoading(true);
    try {
// @ts-expect-error - Legacy compatibility
      const { deleteEvent } = await import("@/app/actions/system/event.action");
      const result = await deleteEvent(event.id);

      if (result.success) {
        toast.success("Event deleted successfully");
        router.refresh();
        onSuccess();
      } else {
        toast.error(result.error || "Failed to delete event");
      }
    } catch (error) {
      console.error("Delete event error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      <div className="space-y-2">
        <Label htmlFor="title">Event Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter event title"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Enter event description"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="startTime">Start Time *</Label>
        <Input
          id="startTime"
          type="datetime-local"
          value={formData.startTime}
          onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="endTime">End Time</Label>
        <Input
          id="endTime"
          type="datetime-local"
          value={formData.endTime}
          onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "Saving..." : event?.id ? "Update Event" : "Create Event"}
        </Button>
        {event?.id && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
