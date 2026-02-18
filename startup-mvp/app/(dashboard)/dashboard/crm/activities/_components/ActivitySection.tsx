"use client";

import { useState, useEffect } from "react";
import ActivityTimeline from "./ActivityTimeline";
import ActivitySheet from "./ActivitySheet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FiPlus } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { getUsers } from "@/app/actions/user.action";
import SystemEventForm from "./SystemEventForm";
import { TaskForm } from "@/app/(dashboard)/dashboard/tasks/_components/TaskForm";
import { NoteForm } from "@/app/(dashboard)/dashboard/notes/_components/NoteForm";
import { DocForm } from "@/app/(dashboard)/dashboard/docs/_components/DocForm";
import { 
    Sheet, 
    SheetContent, 
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

interface ActivitySectionProps {
  entityId: string;
  entityType: "contact" | "opportunity" | "lead";
  activities: any[];
  tasks?: any[];
  notes?: any[];
  events?: any[];
  docs?: any[];
  // Optional: Pass context data if needed for the form to allow linking other items
  contextData?: {
    contacts?: any[];
    opportunities?: any[];
    leads?: any[];
  };
}

export default function ActivitySection({ 
    entityId, 
    entityType, 
    activities,
    tasks = [],
    notes = [],
    events = [],
    docs = [],
    contextData 
}: ActivitySectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [selectedNote, setSelectedNote] = useState<any | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [isTaskSheetOpen, setIsTaskSheetOpen] = useState(false);
  const [isNoteSheetOpen, setIsNoteSheetOpen] = useState(false);
  const [isEventSheetOpen, setIsEventSheetOpen] = useState(false);
  const [isDocSheetOpen, setIsDocSheetOpen] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchUsers = async () => {
        const result = await getUsers();
        if (result.success) {
            setUsers(result.users || []);
        }
    };
    fetchUsers();
  }, []);

  const handleSuccess = () => {
    setIsOpen(false);
    setSelectedActivity(null);
    setIsTaskSheetOpen(false);
    setIsNoteSheetOpen(false);
    setIsEventSheetOpen(false);
    setIsDocSheetOpen(false);
    setSelectedTask(null);
    setSelectedNote(null);
    setSelectedEvent(null);
    setSelectedDoc(null);
    router.refresh();
  };

  const handleActivityClick = (activity: any) => {
    // If it's a legacy activity, use the ActivitySheet
    if (!activity.metadata?.eventType) {
        setSelectedActivity(activity);
        return;
    }

    const eventType = activity.metadata.eventType;
    const resourceId = activity.metadata.taskId || activity.metadata.noteId || activity.metadata.eventId || activity.metadata.docId;

    // Handle lifecycle events with navigation
    if (eventType === 'LEAD_CONVERTED' || eventType === 'OPPORTUNITY_CREATED') {
        const oppId = activity.metadata.opportunityId;
        if (oppId) {
            router.push(`/dashboard/crm/opportunities/${oppId}`);
            return;
        }
    }

    // Handle resource-specific events
    if (eventType === 'TASK_CREATED' || eventType === 'TASK_COMPLETED' || activity.metadata.taskId) {
        const task = tasks.find(t => t.id === activity.metadata.taskId);
        if (task) {
            setSelectedTask(task);
            setIsTaskSheetOpen(true);
        }
    } else if (eventType === 'NOTE_CREATED' || activity.metadata.noteId) {
        const note = notes.find(n => n.id === activity.metadata.noteId);
        if (note) {
            setSelectedNote(note);
            setIsNoteSheetOpen(true);
        }
    } else if (eventType === 'EVENT_SCHEDULED' || activity.metadata.eventId) {
        const event = events.find(e => e.id === activity.metadata.eventId);
        if (event) {
            setSelectedEvent(event);
            setIsEventSheetOpen(true);
        }
    } else if (eventType === 'DOC_CREATED' || activity.metadata.docId) {
        const doc = docs.find(d => d.id === activity.metadata.docId);
        if (doc) {
            setSelectedDoc(doc);
            setIsDocSheetOpen(true);
        }
    } else {
        // Fallback for generic updates or system events without specific sheets
        setSelectedActivity(activity);
    }
  };

  return (
    <div className="space-y-6">


      <ActivityTimeline 
        activities={activities} 
        onActivityClick={handleActivityClick}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
          </DialogHeader>
          <SystemEventForm
            entityType={entityType as any}
            entityId={entityId}
            onSuccess={handleSuccess}
            onCancel={() => setIsOpen(false)}
            users={users}
          />
        </DialogContent>
      </Dialog>

      <ActivitySheet
        isOpen={!!selectedActivity}
        onOpenChange={(open: boolean) => !open && setSelectedActivity(null)}
        activity={selectedActivity}
        onSuccess={handleSuccess}
        contacts={contextData?.contacts}
        opportunities={contextData?.opportunities}
        leads={contextData?.leads}
        users={users}
      />

      {/* Dynamic Sheets for Polymorphic Entities */}
      <Sheet open={isTaskSheetOpen} onOpenChange={setIsTaskSheetOpen}>
        <SheetContent className="sm:max-w-md">
            <SheetHeader className="mb-4">
                <SheetTitle>Edit Task</SheetTitle>
            </SheetHeader>
            {selectedTask && (
                <TaskForm 
                    entityId={entityId}
                    entityType={entityType}
                    initialData={selectedTask}
                    onSuccess={handleSuccess}
                    onCancel={() => setIsTaskSheetOpen(false)}
                />
            )}
        </SheetContent>
      </Sheet>

      <Sheet open={isNoteSheetOpen} onOpenChange={setIsNoteSheetOpen}>
        <SheetContent className="sm:max-w-md">
            <SheetHeader className="mb-4">
                <SheetTitle>Edit Note</SheetTitle>
            </SheetHeader>
            {selectedNote && (
                <NoteForm 
                    entityId={entityId}
                    entityType={entityType}
                    initialData={selectedNote}
                    onSuccess={handleSuccess}
                    onCancel={() => setIsNoteSheetOpen(false)}
                />
            )}
        </SheetContent>
      </Sheet>

      <Sheet open={isEventSheetOpen} onOpenChange={setIsEventSheetOpen}>
        <SheetContent className="sm:max-w-md">
            <SheetHeader className="mb-4">
                <SheetTitle>Edit Event</SheetTitle>
            </SheetHeader>
            {selectedEvent && (
                <SystemEventForm 
                    entityId={entityId}
                    entityType={entityType as any}
                    initialData={selectedEvent}
                    onSuccess={handleSuccess}
                    onCancel={() => setIsEventSheetOpen(false)}
                    users={users}
                />
            )}
        </SheetContent>
      </Sheet>

      {/* Doc Sheet */}
      <Sheet open={isDocSheetOpen} onOpenChange={setIsDocSheetOpen}>
        <SheetContent className="sm:max-w-md">
            <SheetHeader className="mb-4">
                <SheetTitle>Edit Document</SheetTitle>
            </SheetHeader>
            {selectedDoc && (
                <DocForm 
                    initialData={selectedDoc}
                    onSuccess={handleSuccess}
                    onCancel={() => setIsDocSheetOpen(false)}
                />
            )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
