import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOpportunityById } from "@/app/actions/crm/opportunity.action";
import { listActivitiesByOpportunity } from "@/app/actions/crm/activity.action";
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
import { ArrowLeftIcon, Clock, CheckSquare, FileText, Layout, DollarSign, Calendar, User, UserPlus, CalendarDays, Folder, StickyNote } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return redirect("/login");

  const canView = await checkPermission(session.user.id, "crm.opportunities", "view");
  if (!canView) {
      return (
        <div className="p-6">
          <div className="rounded-md bg-destructive/15 p-4 text-destructive">
            You do not have permission to view Opportunities.
          </div>
        </div>
      );
  }

  const [oppResult, taskResult, noteResult, docResult, eventResult, timelineResult, userResult] = await Promise.all([
    getOpportunityById(id),
    getTasks(id, "opportunity", 20),
    getNotes(id, "opportunity", 20),
    getDocs(id, "opportunity", 20),
    getSystemEvents("opportunity", id, 20),
    getSystemTimeline("opportunity", id, 50),
    getUsers(),
  ]);

  if (!oppResult.success || !oppResult.opportunity) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          {oppResult.error || "Opportunity not found"}
        </div>
      </div>
    );
  }

  const opportunity = oppResult.opportunity;
  const tasks = taskResult.success ? taskResult.tasks : [];
  const notes = noteResult.success ? noteResult.notes : [];
  const docs = docResult.success ? docResult.docs : [];
  const events = eventResult.events || [];
  const users = userResult.success ? userResult.users : [];
  const timelineResultData = timelineResult as any;
  const timelineEvents = (timelineResultData?.events || []) as any[];

  // For the timeline, we primarily use timelineEvents (which are Activity records)
  const allActivities = [...timelineEvents].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-6 max-w-full mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/crm/opportunities">
                <ArrowLeftIcon className="h-4 w-4" />
            </Link>
        </Button>
        <div>
           <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{opportunity.title}</h1>
            <Badge variant="outline" className="font-bold border-primary/20 text-primary bg-primary/5 uppercase tracking-wider px-2 py-0.5 h-6">
                {opportunity.stage}
            </Badge>
           </div>
           <p className="text-muted-foreground text-sm font-medium">
             {opportunity.client?.name} • Created on {opportunity.createdAt ? format(new Date(opportunity.createdAt), "PPP") : "-"}
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
                            entityId={opportunity.id} 
                            entityType="opportunity" 
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
                                entityId={opportunity.id} 
                                entityType="opportunity" 
                                tasks={tasks}
                                users={users}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="events">
                        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                            <EventManager 
                                entityId={opportunity.id} 
                                entityType="opportunity" 
                                events={events}
                                users={users as any}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="notes">
                        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                            <NoteManager 
                                entityId={opportunity.id} 
                                entityType="opportunity" 
                                notes={notes}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="docs">
                         <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden text-card-foreground">
                            <DocManager 
                                entityId={opportunity.id} 
                                entityType="opportunity" 
                                docs={docs} 
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="files">
                        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden text-card-foreground">
                            <FileManager 
                                path={`crm/opportunities/${opportunity.id}`} 
                                title="Opportunity Documents" 
                            />
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>

        {/* Sidebar: Details */}
        <div className="space-y-4">
            <Card className="shadow-sm border-slate-200 overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b py-4">
                    <CardTitle className="text-base font-semibold">Deal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm pt-4">
                    <div className="flex items-start gap-3">
                        <div className="bg-emerald-100/50 p-2 rounded text-emerald-600">
                            <DollarSign className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Deal Value</p>
                            <span className="font-bold text-lg text-emerald-700">
                                ${Number(opportunity.value ?? 0).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 pt-2">
                        <div className="bg-blue-100/50 p-2 rounded text-blue-600">
                            <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Expected Close</p>
                            <span className="font-medium">
                                {opportunity.expectedCloseDate ? format(new Date(opportunity.expectedCloseDate), "MMM d, yyyy") : "Not set"}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b py-4 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-base font-semibold">Customer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm pt-4">
                    {opportunity.contact ? (
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                {opportunity.contact.firstName?.[0]}
                            </div>
                            <div className="min-w-0">
                                <p className="font-semibold truncate">
                                    {opportunity.contact.firstName} {opportunity.contact.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground truncate italic">
                                    {opportunity.contact.email}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-muted-foreground italic text-center py-2">No contact linked</p>
                    )}
                </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b py-4">
                    <CardTitle className="text-base font-semibold">Ownership</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm pt-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium">
                            {opportunity.owner?.name?.[0] || "?"}
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Deal Owner</p>
                            <span className="font-medium">{opportunity.owner?.name || "Unassigned"}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
