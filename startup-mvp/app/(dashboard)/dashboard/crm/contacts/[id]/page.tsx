import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getContactById } from "@/app/actions/crm/contact.action";
import { listActivitiesByContact } from "@/app/actions/crm/activity.action";
import { getTasks } from "@/app/actions/system/task.action";
import { getNotes } from "@/app/actions/system/note.action";
import { getSystemTimeline } from "@/app/actions/system/timeline";
import { getSystemEvents } from "@/app/actions/system/events";
import { getDocs } from "@/app/actions/system/doc.action";
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
import { 
    ArrowLeft, 
    Building2, 
    Calendar, 
    Mail, 
    Phone, 
    User, 
    Clock, 
    CheckSquare, 
    FileText, 
    Folder, 
    Briefcase,
    CalendarDays,
    StickyNote
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return redirect("/login");

  const canView = await checkPermission(session.user.id, "crm.contacts", "view");
  if (!canView) {
      return (
        <div className="p-6">
          <div className="rounded-md bg-destructive/15 p-4 text-destructive">
            You do not have permission to view Contacts.
          </div>
        </div>
      );
  }

  const [contactResult, taskResult, noteResult, docResult, eventResult, timelineResult, userResult] = await Promise.all([
    getContactById(id),
    getTasks(id, "contact", 20),
    getNotes(id, "contact", 20),
    getDocs(id, "contact", 20),
    getSystemEvents("contact", id, 20),
    getSystemTimeline("contact", id, 50),
    getActiveUsers(),
  ]);

  if (!contactResult.success || !contactResult.contact) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {contactResult.error || "Contact not found"}
        </div>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/dashboard/crm/contacts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contacts
          </Link>
        </Button>
      </div>
    );
  }

  const { contact } = contactResult;
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/crm/contacts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {contact.firstName} {contact.lastName}
          </h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <Briefcase className="h-3 w-3" />
            {contact.role || "No Role"} {contact.client ? `at ${contact.client.company || contact.client.name}` : ""}
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
                            entityId={contact.id} 
                            entityType="contact" 
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
                                entityId={contact.id} 
                                entityType="contact" 
                                tasks={tasks}
                                users={users}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="events">
                        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                            <EventManager 
                                entityId={contact.id} 
                                entityType="contact" 
                                events={events}
                                users={users as any}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="notes">
                        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                            <NoteManager 
                                entityId={contact.id} 
                                entityType="contact" 
                                notes={notes}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="docs">
                         <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden text-card-foreground">
                            <DocManager 
                                entityId={contact.id} 
                                entityType="contact" 
                                docs={docs} 
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="files">
                        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden text-card-foreground">
                            <FileManager 
                                path={`crm/contacts/${contact.id}`} 
                                title="Contact Documents" 
                            />
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <Card className="shadow-sm border-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b py-4">
              <CardTitle className="text-base font-semibold">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-sm">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded text-slate-500">
                        <Mail className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Email</p>
                        <p className="font-medium truncate">{contact.email || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded text-slate-500">
                        <Phone className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Phone</p>
                        <p className="font-medium truncate">{contact.phone || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded text-slate-500">
                        <Calendar className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Added On</p>
                        <p className="font-medium">{format(new Date(contact.createdAt), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b py-4">
              <CardTitle className="text-base font-semibold">Organization</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {contact.client ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <Link 
                      href={`/dashboard/crm/clients/${contact.client.id}`}
                      className="font-semibold hover:text-primary transition-colors truncate block"
                    >
                      {contact.client.company || contact.client.name}
                    </Link>
                    <p className="text-xs text-muted-foreground font-medium">Linked Account</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-center py-2 text-muted-foreground italic">No organization linked</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
