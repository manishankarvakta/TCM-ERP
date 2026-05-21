"use client";

import { useState, useEffect } from "react";
import ActivitySection from "@/app/(dashboard)/dashboard/crm/activities/_components/ActivitySection";
import { getNotes } from "@/app/actions/system/note.action";
import { getSystemEvents } from "@/app/actions/system/events";
import { Skeleton } from "@/components/ui/skeleton";

export default function IssueActivityWrapper({ issueId, users }: { issueId: string, users: any[] }) {
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [notesRes, eventsRes] = await Promise.all([
        getNotes(issueId, "issue", 50),
        getSystemEvents("issue", issueId, 50)
      ]);
      
      if (notesRes.success) setNotes(notesRes.notes || []);
      if (eventsRes.events) setEvents(eventsRes.events || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [issueId]);

  // Combine and sort activities for the timeline
  const activities = [...events, ...notes].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (loading) {
    return <div className="space-y-4 p-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-24 w-full" /></div>;
  }

  return (
    <div className="mt-6 border-t border-border/40 pt-6">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Mission Comments & Logs</h3>
      <ActivitySection 
        entityId={issueId}
        entityType="issue"
        activities={activities}
        notes={notes}
        events={events}
        users={users}
      />
    </div>
  );
}
