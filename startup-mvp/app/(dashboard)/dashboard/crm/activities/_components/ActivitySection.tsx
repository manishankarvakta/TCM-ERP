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
import { getTaskById } from "@/app/actions/system/task.action";
import { getNoteById } from "@/app/actions/system/note.action";
import { getDocById } from "@/app/actions/system/doc.action";
import { getSystemEventById } from "@/app/actions/system/events";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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

  const handleActivityClick = async (activity: any) => {
    const metadata = activity.metadata || {};
    const eventType = metadata.eventType;
    const type = (activity.type || "").toLowerCase();
    const subjectType = (activity.subjectType || "").toLowerCase();

    // Determine target ID and type
    const taskId = metadata.taskId || (subjectType === 'task' ? activity.subjectId : null);
    const noteId = metadata.noteId || (subjectType === 'note' ? activity.subjectId : null);
    const eventId = metadata.eventId || (subjectType === 'event' || subjectType === 'meeting' ? activity.subjectId : null);
    const docId = metadata.docId || (subjectType === 'doc' ? activity.subjectId : null);

    // Handle lifecycle events with navigation
    if (eventType === 'LEAD_CONVERTED' || eventType === 'OPPORTUNITY_CREATED') {
        const oppId = metadata.opportunityId;
        if (oppId) {
            router.push(`/dashboard/crm/opportunities/${oppId}`);
            return;
        }
    }

    // Task Logic
    const isTask = taskId || type.includes('task') || eventType?.includes('TASK');
    if (isTask) {
        const targetId = taskId || (type.includes('task') ? activity.id : null);
        if (targetId) {
            let task = tasks.find(t => t.id === targetId);
            if (!task) {
                const res = await getTaskById(targetId);
                if (res.success) task = res.task;
            }
            if (task) {
                setSelectedTask(task);
                setIsTaskSheetOpen(true);
                return;
            }
        }
    }

    // Note Logic
    const isNote = noteId || type.includes('note') || eventType?.includes('NOTE');
    if (isNote) {
        const targetId = noteId || (type.includes('note') ? activity.id : null);
        if (targetId) {
            let note = notes.find(n => n.id === targetId);
            if (!note) {
                const res = await getNoteById(targetId);
                if (res.success) note = res.note;
            }
            if (note) {
                setSelectedNote(note);
                setIsNoteSheetOpen(true);
                return;
            }
        }
    }

    // Event/Meeting Logic
    const isEvent = eventId || type.includes('meeting') || type.includes('event') || eventType?.includes('EVENT');
    if (isEvent) {
        const targetId = eventId || ((type.includes('meeting') || type.includes('event')) ? activity.id : null);
        if (targetId) {
            let event = events.find(e => e.id === targetId);
            if (!event) {
                const res = await getSystemEventById(targetId);
                if (res.success) event = res.event;
            }
            if (event) {
                setSelectedEvent(event);
                setIsEventSheetOpen(true);
                return;
            }
        }
    }

    // Doc Logic
    const isDoc = docId || type.includes('doc') || eventType?.includes('DOC');
    if (isDoc) {
        const targetId = docId || (type.includes('doc') ? activity.id : null);
        if (targetId) {
            let doc = docs.find(d => d.id === targetId);
            if (!doc) {
                const res = await getDocById(targetId);
                if (res.success) doc = res.doc;
            }
            if (doc) {
                setSelectedDoc(doc);
                setIsDocSheetOpen(true);
                return;
            }
        }
    }

    // Fallback for generic updates, system events, etc.
    setSelectedActivity(activity);
  };

  return (
    <div className="space-y-6">


      <div className="max-h-[600px] overflow-y-auto pr-1">
        <ActivityTimeline 
          activities={activities} 
          onActivityClick={handleActivityClick}
        />
      </div>

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
                    key={selectedEvent.id}
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
        <SheetContent className="sm:max-w-3xl">
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
