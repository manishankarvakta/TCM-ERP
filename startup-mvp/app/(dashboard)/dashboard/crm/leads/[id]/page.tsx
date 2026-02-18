import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLeadById } from "@/app/actions/crm/lead.action";
import { listActivitiesByLead } from "@/app/actions/crm/activity.action";
import { getTasks } from "@/app/actions/system/task.action";
import { getNotes } from "@/app/actions/system/note.action";
import { getDocs } from "@/app/actions/system/doc.action";
import { getSystemTimeline } from "@/app/actions/system/timeline";
import { getSystemEvents } from "@/app/actions/system/events";
import { getUsers } from "@/app/actions/user.action";
import { checkPermission } from "@/lib/permissions";
import ActivitySection from "../../activities/_components/ActivitySection";
import TaskManager from "../../activities/_components/TaskManager";
import EventManager from "../../activities/_components/EventManager";
import NoteManager from "../../activities/_components/NoteManager";
import DocManager from "../../activities/_components/DocManager";
import FileManager from "../../activities/_components/FileManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowLeftIcon, MailIcon, PhoneIcon, BuildingIcon, Clock, Calendar, CheckSquare, FileText, Folder, Hash, Globe, CalendarDays, StickyNote } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return redirect("/login");

  const canView = await checkPermission(session.user.id, "crm.leads", "view");
  if (!canView) {
      return (
        <div className="p-6">
          <div className="rounded-md bg-destructive/15 p-4 text-destructive">
            You do not have permission to view Leads.
          </div>
        </div>
      );
  }

  const [leadResult, taskResult, noteResult, docResult, eventResult, timelineResult, userResult] = await Promise.all([
    getLeadById(id),
    getTasks(id, "lead", 20),
    getNotes(id, "lead", 20),
    getDocs(id, "lead", 20),
    getSystemEvents("lead", id, 20),
    getSystemTimeline("lead", id, 50),
    getUsers(),
  ]);

  if (!leadResult.success || !leadResult.lead) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          {leadResult.error || "Lead not found"}
        </div>
      </div>
    );
  }

  const lead = leadResult.lead;
  const tasks = taskResult.success ? taskResult.tasks : [];
  const notes = noteResult.success ? noteResult.notes : [];
  const docs = docResult.success ? docResult.docs : [];
  const events = eventResult.events || [];
  const users = userResult.success ? userResult.users : [];
  const timelineResultData = timelineResult as any;
  const timelineEvents = (timelineResultData?.events || []) as any[];

  // For the timeline, we primarily use timelineEvents (which are Activity records)
  // We keep the tasks/notes/docs for the specific tabs and for metadata lookup in ActivitySection
  const allActivities = [...timelineEvents].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive" | "success" | null | undefined> = {
    NEW: "default",
    CONTACTED: "secondary",
    QUALIFIED: "success",
    UNQUALIFIED: "destructive",
    CONVERTED: "outline",
  };


  return (
    <div className="space-y-6 max-w-full mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/crm/leads">
                <ArrowLeftIcon className="h-4 w-4" />
            </Link>
        </Button>
        <div>
           <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{lead.name}</h1>
            <Badge variant={statusColors[lead.status] || "default"}>{lead.status}</Badge>
           </div>
           <p className="text-muted-foreground text-sm font-medium">
             {lead.company} • Created on {lead.createdAt ? format(new Date(lead.createdAt), "PPP") : "-"}
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content: Tabs */}
        <div className="lg:col-span-3 space-y-6">
            <Tabs defaultValue="timeline" className="w-full">
                <TabsList className="flex w-full justify-start h-auto bg-transparent border-b rounded-none p-0 mb-6 gap-8 overflow-x-auto">
                    <TabsTrigger 
                        value="timeline" 
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3 bg-transparent shadow-none gap-2 hover:text-primary transition-all"
                    >
                        <Clock className="h-4 w-4" />
                        <span className="font-semibold">Timeline</span>
                    </TabsTrigger>
                    <TabsTrigger 
                        value="events" 
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3 bg-transparent shadow-none gap-2 hover:text-primary transition-all"
                    >
                        <CalendarDays className="h-4 w-4" />
                        <span className="font-semibold">Events</span>
                        {events.length > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 min-w-5 flex items-center justify-center p-0 text-[10px]">
                                {events.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger 
                        value="tasks" 
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3 bg-transparent shadow-none gap-2 hover:text-primary transition-all"
                    >
                        <CheckSquare className="h-4 w-4" />
                        <span className="font-semibold">Tasks</span>
                        {tasks.length > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 min-w-5 flex items-center justify-center p-0 text-[10px]">
                                {tasks.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger 
                        value="notes" 
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3 bg-transparent shadow-none gap-2 hover:text-primary transition-all"
                    >
                        <StickyNote className="h-4 w-4" />
                        <span className="font-semibold">Notes</span>
                        {notes.length > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 min-w-5 flex items-center justify-center p-0 text-[10px]">
                                {notes.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    
                     <TabsTrigger 
                        value="docs" 
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3 bg-transparent shadow-none gap-2 hover:text-primary transition-all"
                    >
                        <FileText className="h-4 w-4" />
                        <span className="font-semibold">Docs</span>
                        {docs.length > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 min-w-5 flex items-center justify-center p-0 text-[10px]">
                                {docs.length}
                            </Badge>
                        )}
                    </TabsTrigger>

                    <TabsTrigger 
                        value="files" 
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3 bg-transparent shadow-none gap-2 hover:text-primary transition-all"
                    >
                        <Folder className="h-4 w-4" />
                        <span className="font-semibold">Files</span>
                    </TabsTrigger>
                </TabsList>

                <div className="mt-4">
                    <TabsContent value="timeline">
                        <ActivitySection 
                            entityId={lead.id} 
                            entityType="lead" 
                            activities={allActivities}
                            tasks={tasks}
                            notes={notes}
                            events={allActivities}
                            docs={docs}
                        />
                    </TabsContent>

                    <TabsContent value="tasks">
                        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                            <TaskManager 
                                entityId={lead.id} 
                                entityType="lead" 
                                tasks={tasks}
                                users={users}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="events">
                        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                            <EventManager 
                                entityId={lead.id} 
                                entityType="lead" 
                                events={events}
                                users={users as any}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="notes">
                        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                            <NoteManager 
                                entityId={lead.id} 
                                entityType="lead" 
                                notes={notes}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="docs">
                         <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden text-card-foreground">
                            <DocManager 
                                entityId={lead.id} 
                                entityType="lead" 
                                docs={docs} 
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="files">
                        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden text-card-foreground">
                            <FileManager 
                                path={`crm/leads/${lead.id}`} 
                                title="Lead Documents" 
                            />
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>

        {/* Sidebar: Details */}
        <div className="space-y-6">
            <Card className="shadow-sm border-slate-200 overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b py-4">
                    <CardTitle className="text-base font-semibold">Lead Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm pt-4">
                     {lead.leadNumber && (
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded">
                                <Hash className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Lead Number</p>
                                <span className="font-medium">{lead.leadNumber}</span>
                            </div>
                        </div>
                    )}

                    {lead.email && (
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded">
                                <MailIcon className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Email</p>
                                <a href={`mailto:${lead.email}`} className="font-medium hover:underline truncate block">
                                    {lead.email}
                                </a>
                            </div>
                        </div>
                    )}

                    {lead.phone && (
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded">
                                <PhoneIcon className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Phone</p>
                                <a href={`tel:${lead.phone}`} className="font-medium hover:underline">
                                    {lead.phone}
                                </a>
                            </div>
                        </div>
                    )}

                    {lead.company && (
                         <div className="pt-4 border-t flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded">
                                <BuildingIcon className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Company</p>
                                <span className="font-medium">{lead.company}</span>
                            </div>
                         </div>
                    )}

                    {lead.source && (
                        <div className="pt-4 border-t flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded">
                                <Globe className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Source</p>
                                <span className="font-medium">{lead.source}</span>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {lead.owner?.name?.[0] || "?"}
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Lead Owner</p>
                            <span className="font-medium">{lead.owner?.name}</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded">
                                <Calendar className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Created At</p>
                                <span className="font-medium">{lead.createdAt ? format(new Date(lead.createdAt), "PPp") : "-"}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded">
                                <Clock className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Last Updated</p>
                                <span className="font-medium">{lead.updatedAt ? format(new Date(lead.updatedAt), "PPp") : "-"}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
