import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOpportunityById } from "@/app/actions/crm/opportunity.action";
import { listActivitiesByOpportunity } from "@/app/actions/crm/activity.action";
import { getTasks } from "@/app/actions/system/task.action";
import { getNotes } from "@/app/actions/system/note.action";
import { getDocs } from "@/app/actions/system/doc.action";
import { getSystemTimeline } from "@/app/actions/system/timeline";
import { getSystemEvents } from "@/app/actions/system/events";
import { getActiveUsers } from "@/app/actions/user.action";
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
import { Clock, CheckSquare, FileText, Layout, DollarSign, Calendar, User, UserPlus, CalendarDays, Folder, StickyNote, Hash, Phone, MapPin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PromoteToProject from "./_components/PromoteToProject";
import { OpportunityStageBadge } from "./_components/OpportunityStageBadge";
import { BackButton } from "@/components/ui/back-button";

const parseAltPhone = (raw: string | null | undefined) => {
  if (!raw) return { num: "", label: "" };
  if (raw.includes("|")) {
    const [num, type] = raw.split("|");
    let label = "Alternative";
    if (type === "whatsapp") label = "WhatsApp";
    if (type === "contact") label = "Contact Person";
    if (type === "alternative") label = "Alternative";
    return { num, label };
  }
  return { num: raw, label: "Alternative" };
};

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return redirect("/login");

  const [canView, canEdit] = await Promise.all([
    checkPermission(session.user.id, "crm.opportunities", "view"),
    checkPermission(session.user.id, "crm.opportunities", "edit"),
  ]);
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
    getActiveUsers(),
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/40">
        <div className="flex items-center gap-4">
            <BackButton 
              fallbackUrl="/dashboard/crm/opportunities" 
              className="rounded-xl h-12 w-12 hover:bg-muted" 
            />
            <div>
            <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black uppercase tracking-tighter">{opportunity.title}</h1>
                {canEdit ? (
                    <OpportunityStageBadge opportunityId={opportunity.id} currentStage={opportunity.stage} />
                ) : (
                    <Badge variant="outline" className="font-black border-primary/20 text-primary bg-primary/5 uppercase tracking-widest px-4 py-1.5 h-auto text-[10px] rounded-full shadow-sm animate-pulse">
                        {opportunity.stage}
                    </Badge>
                )}
            </div>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1 opacity-70">
                {opportunity.opportunityNumber} • {opportunity.client?.name} • Created {opportunity.createdAt ? format(new Date(opportunity.createdAt), "MMM dd, yyyy") : "-"}
            </p>
            </div>
        </div>
        
        <div className="flex items-center gap-3 ml-auto md:ml-0">
          <Link href={`/dashboard/crm/requirements/new?opportunityId=${opportunity.id}`}>
            <Button variant="outline" className="font-semibold text-xs h-10 border-indigo-200 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50">
              <FileText className="h-4 w-4 mr-1.5" /> Requirement Package
            </Button>
          </Link>
            <PromoteToProject opportunity={opportunity} />
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
                            events={events}
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
                <CardHeader className="bg-slate-50/50 border-b py-3">
                    <CardTitle className="text-base font-semibold">Deal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm pt-4">
                    {opportunity.stage === "UNQUALIFIED" && opportunity.closingReason && (
                        <div className="flex items-start gap-3 bg-destructive/5 border border-destructive/20 p-3 rounded-lg mb-2">
                            <div className="bg-destructive/10 p-2 rounded text-destructive shrink-0">
                                <Clock className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-destructive-foreground uppercase tracking-wider font-bold">Closing Reason</p>
                                <p className="text-sm text-destructive mt-1 font-medium">{opportunity.closingReason}</p>
                            </div>
                        </div>
                    )}
                    <div className="flex items-start gap-3">
                        <div className="bg-slate-100 p-2 rounded text-slate-600">
                            <Hash className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Deal Number</p>
                            <span className="font-medium">
                                {opportunity.opportunityNumber}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="bg-emerald-100/50 p-2 rounded text-emerald-600">
                            <DollarSign className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Deal Value</p>
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
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Expected Close</p>
                            <span className="font-medium">
                                {opportunity.expectedCloseDate ? format(new Date(opportunity.expectedCloseDate), "MMM d, yyyy") : "Not set"}
                            </span>
                        </div>
                    </div>

                    {opportunity.lead && (
                        <div className="border-t pt-4 space-y-4">
                            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Source Lead Info</h4>
                            
                            <div className="flex items-start gap-3">
                                <div className="bg-slate-100 p-2 rounded text-slate-600">
                                    <User className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Lead Name</p>
                                    <span className="font-medium text-slate-700 block truncate">{opportunity.lead.name}</span>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="bg-slate-100 p-2 rounded text-slate-600">
                                    <Hash className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Lead Number</p>
                                    <Link 
                                        href={`/dashboard/crm/leads/${opportunity.lead.id}`}
                                        className="font-medium text-primary hover:underline"
                                    >
                                        {opportunity.lead.leadNumber}
                                    </Link>
                                </div>
                            </div>

                            {opportunity.lead.phone && (
                                <div className="flex items-start gap-3">
                                    <div className="bg-slate-100 p-2 rounded text-slate-600">
                                        <Phone className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Mobile Number</p>
                                        <span className="font-medium text-slate-700">{opportunity.lead.phone}</span>
                                    </div>
                                </div>
                            )}

                            {opportunity.lead.location && (
                                <div className="flex items-start gap-3">
                                    <div className="bg-slate-100 p-2 rounded text-slate-600">
                                        <MapPin className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Location</p>
                                        <span className="font-medium text-slate-700">{opportunity.lead.location}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {opportunity.lead && (
                <Card className="shadow-sm border-slate-200 overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b py-4 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-base font-semibold">Source Lead Contact</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm pt-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                {opportunity.lead.name?.[0] || "L"}
                            </div>
                            <div className="min-w-0">
                                <Link 
                                    href={`/dashboard/crm/leads/${opportunity.lead.id}`}
                                    className="font-semibold hover:underline text-primary block truncate"
                                >
                                    {opportunity.lead.name}
                                </Link>
                                <p className="text-xs text-muted-foreground font-mono">
                                    {opportunity.lead.leadNumber}
                                </p>
                            </div>
                        </div>
                        <div className="pt-2 border-t space-y-2 text-xs text-muted-foreground">
                            {opportunity.lead.email && (
                                <div className="flex justify-between">
                                    <span>Email:</span>
                                    <span className="font-medium text-slate-700">{opportunity.lead.email}</span>
                                </div>
                            )}
                            {opportunity.lead.phone && (
                                <div className="flex justify-between items-center">
                                    <span>Phone:</span>
                                    <a
                                        href={`https://wa.me/${opportunity.lead.phone.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-green-600 hover:text-green-700 hover:underline flex items-center gap-1"
                                    >
                                        <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                        </svg>
                                        {opportunity.lead.phone}
                                    </a>
                                </div>
                            )}
                            {opportunity.lead.alternativePhone && (() => {
                                const { num, label } = parseAltPhone(opportunity.lead.alternativePhone);
                                return (
                                  <div className="flex justify-between items-center">
                                      <span>Alt Phone ({label}):</span>
                                      <a
                                          href={`https://wa.me/${num.replace(/\D/g, '')}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="font-medium text-green-600 hover:text-green-700 hover:underline flex items-center gap-1"
                                      >
                                          <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                          </svg>
                                          {num}
                                      </a>
                                  </div>
                                );
                            })()}
                            {opportunity.lead.source && (
                                <div className="flex justify-between">
                                    <span>Source:</span>
                                    <span className="font-medium text-slate-700">{opportunity.lead.source}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

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
