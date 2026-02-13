import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOpportunityById } from "@/app/actions/crm/opportunity.action";
import { listActivitiesByOpportunity } from "@/app/actions/crm/activity.action";
import { getTasks } from "@/app/actions/system/task.action";
import { getNotes } from "@/app/actions/system/note.action";
import { checkPermission } from "@/lib/permissions";
import ActivitySection from "../../activities/_components/ActivitySection";
import TaskManager from "../../activities/_components/TaskManager";
import NoteManager from "../../activities/_components/NoteManager";
import FileManager from "../../activities/_components/FileManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowLeftIcon, Clock, CheckSquare, FileText, Layout, DollarSign, Calendar, User, UserPlus } from "lucide-react";
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

  const [oppResult, activityResult, taskResult, noteResult] = await Promise.all([
    getOpportunityById(id),
    listActivitiesByOpportunity(id),
    getTasks(1, 100, id, "opportunity"),
    getNotes(1, 100, id, "opportunity")
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
  const activities = activityResult.success ? activityResult.activities : [];
  const tasks = taskResult.success ? taskResult.tasks : [];
  const notes = noteResult.success ? noteResult.notes : [];

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
                <TabsList className="flex w-full justify-start h-auto bg-transparent border-b rounded-none p-0 mb-6 gap-8">
                    <TabsTrigger 
                        value="timeline" 
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3 bg-transparent shadow-none gap-2 hover:text-primary transition-all"
                    >
                        <Clock className="h-4 w-4" />
                        <span className="font-semibold">Timeline</span>
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
                        <FileText className="h-4 w-4" />
                        <span className="font-semibold">Notes</span>
                        {notes.length > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 min-w-5 flex items-center justify-center p-0 text-[10px]">
                                {notes.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger 
                        value="files" 
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3 bg-transparent shadow-none gap-2 hover:text-primary transition-all"
                    >
                        <Layout className="h-4 w-4" />
                        <span className="font-semibold">Files</span>
                    </TabsTrigger>
                </TabsList>

                <div className="mt-4">
                    <TabsContent value="timeline">
                        <ActivitySection 
                            entityId={opportunity.id} 
                            entityType="opportunity" 
                            activities={activities}
                        />
                    </TabsContent>

                    <TabsContent value="tasks">
                        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                            <TaskManager 
                                entityId={opportunity.id} 
                                entityType="opportunity" 
                                tasks={tasks}
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
