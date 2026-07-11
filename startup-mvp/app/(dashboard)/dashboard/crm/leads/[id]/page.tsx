import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLeadById } from "@/app/actions/crm/lead.action";
import { listActivitiesByLead } from "@/app/actions/crm/activity.action";
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
import { LeadStatusBadge } from "../_components/LeadStatusBadge";
import { LeadConversionButton } from "../_components/LeadConversionButton";
import { LeadEditButton } from "../_components/LeadEditButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowLeftIcon, MailIcon, PhoneIcon, BuildingIcon, Clock, Calendar, CheckSquare, FileText, Folder, Hash, Globe, CalendarDays, StickyNote, Layers, Fingerprint } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileManager from "../../activities/_components/FileManager";
import { FiLink } from "react-icons/fi";
import { BackButton } from "@/components/ui/back-button";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return redirect("/login");

  const [canView, canEdit] = await Promise.all([
    checkPermission(session.user.id, "crm.leads", "view"),
    checkPermission(session.user.id, "crm.leads", "edit"),
  ]);
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
    getActiveUsers(),
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

  const lead = leadResult.lead as any;
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

  const startingDateObj = lead.startingDate ? new Date(lead.startingDate) : null;
  const daysActive = startingDateObj 
    ? Math.max(0, Math.floor((new Date().getTime() - startingDateObj.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="space-y-6 max-w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background/50 ">
        <div className="flex items-center gap-4">
          <BackButton 
            fallbackUrl="/dashboard/crm/leads" 
            className="shrink-0" 
          />
          <div className="min-w-0">
             <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate max-w-[200px] sm:max-w-[400px]">{lead.name}</h1>
              <LeadStatusBadge leadId={lead.id} currentStatus={lead.status} />
             </div>
             <p className="text-muted-foreground text-xs sm:text-sm font-medium truncate">
               {lead.company} • Created on {lead.createdAt ? format(new Date(lead.createdAt), "PPP") : "-"}
             </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canEdit && <LeadEditButton lead={lead} />}
          <LeadConversionButton leadId={lead.id} leadName={lead.name} currentStatus={lead.status} />
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
                            events={events}
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
                {lead.photo && (
                  <div className="w-full h-48 bg-muted relative border-b overflow-hidden">
                    <img
                      src={`/api/files/${lead.photo}`}
                      alt={lead.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader className="bg-slate-50/50 border-b py-3">
                    <CardTitle className="text-base font-semibold">Lead Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm pt-4">
                     {lead.status === "UNQUALIFIED" && lead.closingReason && (
                        <div className="flex items-start gap-3 bg-destructive/5 border border-destructive/20 p-3 rounded-lg">
                            <div className="bg-destructive/10 p-2 rounded text-destructive shrink-0">
                                <Clock className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-destructive-foreground uppercase tracking-wider font-bold">Closing Reason</p>
                                <p className="text-sm text-destructive mt-1 font-medium">{lead.closingReason}</p>
                            </div>
                        </div>
                     )}

                     {lead.Category && (
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded">
                                <Layers className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Category</p>
                                <span className="font-semibold text-xs bg-primary/5 text-primary border border-primary/20 px-2 py-0.5 rounded inline-block mt-0.5">
                                  {lead.Category.name}
                                </span>
                            </div>
                        </div>
                     )}

                     {lead.reference && (
                        <div className="pt-4 border-t flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded">
                                <Fingerprint className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Reference</p>
                                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded border text-muted-foreground inline-block mt-0.5">
                                  {lead.reference}
                                </span>
                            </div>
                        </div>
                     )}

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
                                <a
                                    href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium hover:underline flex items-center gap-1.5 text-green-600 hover:text-green-700"
                                >
                                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                    </svg>
                                    {lead.phone}
                                </a>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <div className="bg-slate-100 p-2 rounded">
                            <PhoneIcon className="h-4 w-4 text-slate-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Alternative Phone</p>
                            {lead.alternativePhone ? (
                                <a
                                    href={`https://wa.me/${lead.alternativePhone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium hover:underline flex items-center gap-1.5 text-green-600 hover:text-green-700"
                                >
                                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                    </svg>
                                    {lead.alternativePhone}
                                </a>
                            ) : (
                                <span className="text-muted-foreground italic text-xs">Not provided</span>
                            )}
                        </div>
                    </div>

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

                    {lead.website && (
                        <div className="pt-4 border-t flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded">
                                <Globe className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Website</p>
                                <a href={lead.website} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline truncate block">
                                    {lead.website}
                                </a>
                            </div>
                        </div>
                    )}

                    {lead.facebook && (
                        <div className="pt-4 border-t flex items-start gap-3">
                             <div className="bg-slate-100 p-2 rounded mt-0.5">
                                <FiLink className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1.5">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Social Links</p>
                                <div className="flex flex-col gap-1">
                                    {lead.facebook.split(',').map((link: string, i: number) => {
                                        const trimmed = link.trim();
                                        if (!trimmed) return null;
                                        // Attempt to extract domain for better label
                                        let label = "Link " + (i + 1);
                                        try {
                                            const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
                                            label = url.hostname.replace('www.', '');
                                        } catch (e) {}
                                        return (
                                            <a key={i} href={trimmed.startsWith('http') ? trimmed : `https://${trimmed}`} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline truncate text-primary inline-flex items-center gap-1.5">
                                                <svg className="h-3 w-3 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                                {label}
                                            </a>
                                        );
                                    })}
                                </div>
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
                        {lead.startingDate && (
                            <div className="flex items-center gap-3">
                                <div className="bg-slate-100 p-2 rounded">
                                    <CalendarDays className="h-4 w-4 text-slate-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Starting Date</p>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                        <span className="font-medium">{format(new Date(lead.startingDate), "PP")}</span>
                                        {daysActive !== null && (
                                            <span className="text-[10px] font-semibold text-primary bg-primary/5 border border-primary/20 px-1.5 py-0.5 rounded">
                                                {daysActive === 0 ? "Started today" : `${daysActive} day${daysActive > 1 ? "s" : ""} active`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

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
