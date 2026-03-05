"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { 
    Tabs, 
    TabsContent, 
    TabsList, 
    TabsTrigger 
} from "@/components/ui/tabs";
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { 
    getProjectById, 
    updateProject,
    deleteMilestone,
    deleteIssue
} from "@/app/actions/projects/project.action";
import { getSystemTimeline } from "@/app/actions/system/timeline";
import { getTasks } from "@/app/actions/system/task.action";
import { getNotes } from "@/app/actions/system/note.action";
import { getDocs } from "@/app/actions/system/doc.action";
import { getActiveUsers } from "@/app/actions/user.action";
import { 
    FiBriefcase, 
    FiCheckSquare, 
    FiFileText, 
    FiActivity, 
    FiPlus, 
    FiSettings, 
    FiMessageSquare,
    FiPaperclip,
    FiLayout,
    FiMap,
    FiClock,
    FiEdit3,
    FiTrash2,
    FiTrendingUp,
    FiUsers,
    FiArrowUpRight,
    FiArchive,
    FiPlus as Plus,
    FiClock as Clock
} from "react-icons/fi";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import ActivitySection from "@/app/(dashboard)/dashboard/crm/activities/_components/ActivitySection";
import EntityFiles from "@/components/files/EntityFiles";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import ProjectForm from "@/components/projects/ProjectForm";
import MilestoneForm from "@/components/projects/MilestoneForm";
import IssueForm from "@/components/projects/IssueForm";
import MissionRoadmapPlanner from "@/components/projects/MissionRoadmapPlanner";
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { PartialPermissions, Operation } from "@/types/permissions";

interface ProjectWorkspaceProps {
  id: string;
  permissions?: PartialPermissions;
  initialData: {
      project: any;
      tasks: any[];
      notes: any[];
      docs: any[];
      events: any[];
      allActivities: any[];
      users: any[];
  };
}

export default function ProjectWorkspace({ id, permissions = {}, initialData }: ProjectWorkspaceProps) {
  const hasOp = useCallback((key: string, op: Operation) => {
    const perm = permissions[key];
    if (Array.isArray(perm)) {
      return perm.includes(op);
    }
    return false;
  }, [permissions]);
  
  const [project, setProject] = useState<any>(initialData.project);
  const [loading, setLoading] = useState(false);
  const activities = initialData.allActivities;
  const tasks = initialData.tasks;
  const notes = initialData.notes;
  const docs = initialData.docs;
  const events = initialData.events;
  const users = initialData.users;

  const [activeTab, setActiveTab] = useState("overview");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMilestoneDialogOpen, setIsMilestoneDialogOpen] = useState(false);
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  const fetchProject = async () => {
    try {
      setLoading(true);
      const pRes = await getProjectById(id);
      if (pRes.success) {
        setProject(pRes.project);
      }
    } catch (err) {
      console.error("Fetch project error:", err);
      toast.error("Resource acquisition failure");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  const handleStatusChange = async (status: string) => {
    startTransition(async () => {
        const result = await updateProject(id, { status });
        if (result.success) {
            toast.success(`Project status updated to ${status}`);
            fetchProject();
        }
    });
  };

  const handleDeleteMilestone = async (mId: string) => {
    if (!hasOp("projects.milestones", "delete-permanently") && !hasOp("projects.milestones", "move-to-trash")) {
        toast.error("Permission Denied: projects.milestones.delete");
        return;
    }
    if (!confirm("Are you sure you want to delete this phase?")) return;
    const result = await deleteMilestone(mId);
    if (result.success) {
        toast.success("Phase decommissioned");
        fetchProject();
    } else {
        toast.error("Failed to delete phase");
    }
  };

  const handleDeleteIssue = async (issueId: string) => {
    if (!hasOp("projects.issues", "delete-permanently") && !hasOp("projects.issues", "move-to-trash")) {
        toast.error("Permission Denied: projects.issues.delete");
        return;
    }
    if (!confirm("Are you sure you want to delete this issue?")) return;
    const result = await deleteIssue(issueId);
    if (result.success) {
        toast.success("Issue removed from matrix");
        fetchProject();
    } else {
        toast.error("Failed to delete issue");
    }
  };

  if (loading) {
    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <Skeleton className="h-64 w-full rounded-[2.5rem]" />
            <div className="flex gap-4">
                <Skeleton className="h-12 w-32 rounded-xl" />
                <Skeleton className="h-12 w-32 rounded-xl" />
                <Skeleton className="h-12 w-32 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
                <Skeleton className="h-[500px] md:col-span-2 rounded-[3rem]" />
                <Skeleton className="h-96 rounded-[3rem]" />
            </div>
        </div>
    );
  }

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {/* Main Content: Tabs */}
      <div className="lg:col-span-3 space-y-6">
      <Tabs defaultValue="overview" onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/40 pb-2">
            <TabsList className="bg-transparent p-0 rounded-none h-auto border-none flex flex-wrap md:inline-flex shadow-none gap-8 overflow-x-auto justify-start w-full">
        {["overview", "roadmap", "kanban", "files", "activities"].map((tab) => (
            <TabsTrigger 
                key={tab}
                value={tab} 
                className="rounded-none bg-transparent border-none px-0 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary font-semibold capitalize gap-2 hover:text-primary transition-all relative group flex items-center h-12"
            >
                {tab === "overview" && <FiLayout className="h-4 w-4" />}
                {tab === "roadmap" && <FiMap className="h-4 w-4" />}
                {tab === "kanban" && <FiActivity className="h-4 w-4" />}
                {tab === "files" && <FiPaperclip className="h-4 w-4" />}
                {tab === "activities" && <FiMessageSquare className="h-4 w-4" />}
                {tab === "roadmap" ? "Roadmap" : tab === "kanban" ? "Issues" : tab}
            </TabsTrigger>
        ))}
    </TabsList>
    <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold hover:bg-muted active:scale-95" onClick={fetchProject}>
            <FiActivity className="mr-2 h-3.5 w-3.5 text-primary" /> Sync
        </Button>
         {hasOp("projects.projects", "edit") && (
            <Button variant="outline" size="sm" className="h-8 px-4 font-semibold hover:bg-muted active:scale-95 shadow-sm text-xs" onClick={() => setIsEditDialogOpen(true)}>
                <FiEdit3 className="mr-2 h-3.5 w-3.5" /> Edit
            </Button>
        )}
    </div>
</div>

        <TabsContent value="overview" className="mt-0 focus-visible:ring-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-6">
              <Card className="rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b py-4">
                  <div className="flex items-center justify-between">
                       <CardTitle className="text-base font-semibold">Mission Scope</CardTitle>
                       <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
                           Active Objectives
                       </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="bg-muted/10 rounded-lg p-4 border border-border/40">
                        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                            {project.description || "Mission scope currently being drafted within the centralized workspace. Initial objectives and delivery parameters are pending finalization."}
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: "Budget", value: `$${project.budget?.toLocaleString() || 0}`, icon: <FiTrendingUp className="text-emerald-500 w-4 h-4" /> },
                            { label: "Phases", value: project.Milestones?.length || 0, icon: <FiMap className="text-primary w-4 h-4" /> },
                            { label: "Tasks", value: project._count?.Tasks || 0, icon: <FiCheckSquare className="text-blue-500 w-4 h-4" /> },
                            { label: "Docs", value: project._count?.Docs || 0, icon: <FiFileText className="text-amber-500 w-4 h-4" /> }
                        ].map((stat, i) => (
                            <div key={i} className="bg-background rounded-lg p-4 border border-border/50 shadow-sm flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="bg-muted rounded p-1.5">{stat.icon}</div>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                                    <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Card className="rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b py-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                      Command Center
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                        <AvatarImage src={project.Owner?.image} />
                        <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">{project.Owner?.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-1 flex-1">
                        <h5 className="font-semibold text-base leading-none text-foreground">{project.Owner?.name}</h5>
                        <p className="text-xs font-medium text-muted-foreground">Project Owner</p>
                      </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b py-4">
                   <div className="flex items-center justify-between">
                       <CardTitle className="text-base font-semibold">Health Matrix</CardTitle>
                   </div>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                    {[
                        { label: "Operation Timeline", value: 87, color: "bg-primary" },
                        { label: "Execution Efficiency", value: 94, color: "bg-emerald-500" },
                        { label: "Structural Integrity", value: 100, color: "bg-blue-500" }
                    ].map((m, i) => (
                        <div key={i} className="space-y-2">
                            <div className="flex justify-between text-xs font-medium text-muted-foreground">
                                <span>{m.label}</span>
                                <span className="text-foreground">{m.value}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-secondary overflow-hidden rounded-full">
                                <div className={`h-full ${m.color}`} style={{ width: `${m.value}%` }} />
                            </div>
                        </div>
                    ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="roadmap" className="mt-0 focus-visible:ring-0">
          <Card className="rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b py-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                      Mission Sequence
                  </CardTitle>
                  <CardDescription className="text-sm font-medium text-muted-foreground">
                      Orchestrated roadmap phases for centralized project execution.
                  </CardDescription>
                </div>
                {hasOp("projects.milestones", "create") && (
                  <Button 
                      className="shrink-0"
                      onClick={() => {
                          setSelectedMilestone(null);
                          setIsMilestoneDialogOpen(true);
                      }}
                  >
                      <Plus className="mr-2 h-4 w-4" /> Expand Sequence
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="max-w-5xl mx-auto">
                <MissionRoadmapPlanner 
                    projectId={id}
                    initialMilestones={project.Milestones || []}
                    onRefresh={fetchProject}
                    onEdit={(milestone) => {
                        setSelectedMilestone(milestone);
                        setIsMilestoneDialogOpen(true);
                    }}
                    onDelete={handleDeleteMilestone}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kanban" className="mt-0 focus-visible:ring-0">
             <Card className="rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b py-6 flex gap-4 flex-col md:flex-row md:items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-bold">Issues Matrix</CardTitle>
                        <CardDescription className="text-sm font-medium mt-1">
                            Critical path bug management and feature synchronization hub.
                        </CardDescription>
                    </div>
                    {hasOp("projects.issues", "create") && (
                      <Button 
                          onClick={() => {
                              if (project.Milestones?.length > 0) {
                                  setSelectedIssue(null);
                                  setSelectedMilestone(project.Milestones[0]); 
                                  setIsIssueDialogOpen(true);
                              } else {
                                  toast.error("Initialize a mission sequence first.");
                              }
                          }}
                      >
                          <Plus className="mr-2 h-4 w-4" /> Log Issue
                      </Button>
                    )}
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {project.Milestones?.flatMap((m: any) => m.Issues || []).map((issue: any) => (
                            <Card key={issue.id} className="group border-border/50 bg-card rounded-xl overflow-hidden shadow-sm">
                                <CardContent className="p-5">
                                    <div className="flex justify-between items-start mb-4">
                                        <Badge variant="outline" className={`font-semibold text-[10px] ${
                                            issue.priority === 'CRITICAL' ? 'text-rose-500 border-rose-200 bg-rose-50' : 
                                            issue.priority === 'HIGH' ? 'text-amber-500 border-amber-200 bg-amber-50' : 
                                            issue.priority === 'NORMAL' ? 'text-blue-500 border-blue-200 bg-blue-50' : 'text-slate-500 border-slate-200 bg-slate-50'
                                        }`}>
                                            {issue.priority}
                                        </Badge>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {hasOp("projects.issues", "edit") && (
                                                  <DropdownMenuItem onClick={() => {
                                                      setSelectedIssue(issue);
                                                      setSelectedMilestone(project.Milestones.find((m:any) => m.id === issue.milestoneId));
                                                      setIsIssueDialogOpen(true);
                                                  }}>
                                                      <FiEdit3 className="mr-2 h-4 w-4" /> Modify
                                                  </DropdownMenuItem>
                                                )}
                                                {(hasOp("projects.issues", "delete-permanently") || hasOp("projects.issues", "move-to-trash")) && (
                                                  <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => handleDeleteIssue(issue.id)}>
                                                      <FiTrash2 className="mr-2 h-4 w-4" /> Delete
                                                  </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    
                                    <h6 className="text-base font-semibold tracking-tight mb-2 truncate">{issue.title}</h6>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/50">
                                        {issue.description || "Mission details pending technical review."}
                                    </p>
                                    
                                    <div className="flex items-center justify-between pt-4 border-t border-border/40 mt-auto">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={issue.Assignee?.image} />
                                                <AvatarFallback className="text-[10px] font-semibold">{issue.Assignee?.name?.charAt(0) || "?"}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs font-medium text-muted-foreground truncate max-w-[100px]">
                                                {issue.Assignee?.name || "Unassigned"}
                                            </span>
                                        </div>
                                        <Badge variant="secondary" className="text-[10px] font-semibold">
                                            {issue.status}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
             </Card>
        </TabsContent>

        <TabsContent value="files" className="mt-0 focus-visible:ring-0">
            <Card className="rounded-xl border border-border/50 shadow-sm bg-card p-6">
                <EntityFiles entityId={id} entityType="projects" />
            </Card>
        </TabsContent>

        <TabsContent value="activities" className="mt-0 focus-visible:ring-0">
            <Card className="rounded-xl border border-border/50 shadow-sm bg-card p-6">
                <div className="flex items-center justify-between mb-8 px-2">
                    <div>
                        <h3 className="text-xl font-bold">Mission Timeline</h3>
                        <p className="text-sm font-medium text-muted-foreground mt-1">Chronological action ledger for {project.title}</p>
                    </div>
                </div>
                <ActivitySection 
                    entityId={id} 
                    entityType="project"
                    activities={activities}
                    tasks={tasks}
                    notes={notes}
                    docs={docs}
                    users={users}
                />
            </Card>
        </TabsContent>
      </Tabs>
      </div>

        {/* Sidebar: Details */}
        <div className="space-y-6">
            <Card className="shadow-sm border-slate-200 overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b py-3">
                    <CardTitle className="text-base font-semibold">Project Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm pt-4">
                    {project.projectNumber && (
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded">
                                <FiBriefcase className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Project Code</p>
                                <span className="font-medium">{project.projectNumber}</span>
                            </div>
                        </div>
                    )}

                    {project.Client && (
                         <div className="pt-4 border-t flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded">
                                <FiUsers className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Client</p>
                                <span className="font-medium">{project.Client.name}</span>
                            </div>
                         </div>
                    )}

                    {project.budget !== null && (
                        <div className="pt-4 border-t flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded">
                                <FiTrendingUp className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Budget</p>
                                <span className="font-medium">${project.budget.toLocaleString()}</span>
                            </div>
                        </div>
                    )}
                    
                    <div className="pt-4 border-t flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {project.Owner?.name?.[0] || "?"}
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Project Owner</p>
                            <span className="font-medium">{project.Owner?.name || "Unassigned"}</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded">
                                <FiClock className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Created At</p>
                                <span className="font-medium">{project.createdAt ? format(new Date(project.createdAt), "PPp") : "-"}</span>
                            </div>
                        </div>

                        {project.endDate && (
                          <div className="flex items-center gap-3">
                              <div className="bg-rose-100 p-2 rounded text-rose-600">
                                  <FiMap className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Delivery Deadline</p>
                                  <span className="font-medium">{format(new Date(project.endDate), "PPp")}</span>
                              </div>
                          </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>

      {/* Milestone Dialog */}
      <Dialog open={isMilestoneDialogOpen} onOpenChange={setIsMilestoneDialogOpen}>
          <DialogContent className="sm:max-w-[600px] p-6 rounded-xl bg-background border-border/50 shadow-lg">
                <div className="border-b pb-4 mb-4">
                    <DialogTitle className="text-xl font-bold">Mission Phase</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground mt-1">
                        Define a strategic technical milestone for the current mission sequence.
                    </DialogDescription>
                </div>
                <div className="bg-card">
                    <MilestoneForm 
                        projectId={id}
                        initialData={selectedMilestone}
                        onSuccess={() => {
                            setIsMilestoneDialogOpen(false);
                            fetchProject();
                        }}
                        onCancel={() => setIsMilestoneDialogOpen(false)}
                    />
                </div>
          </DialogContent>
      </Dialog>

      {/* Issue Dialog */}
      <Dialog open={isIssueDialogOpen} onOpenChange={setIsIssueDialogOpen}>
          <DialogContent className="sm:max-w-[600px] p-6 rounded-xl bg-background border-border/50 shadow-lg">
                <div className="border-b pb-4 mb-4">
                    <DialogTitle className="text-xl font-bold">Log Defect/Task</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground mt-1">
                        Synchronize a technical issue or strategic task into the mission sequence.
                    </DialogDescription>
                </div>
                <div className="bg-card">
                    <IssueForm 
                        milestoneId={selectedMilestone?.id}
                        initialData={selectedIssue}
                        onSuccess={() => {
                            setIsIssueDialogOpen(false);
                            fetchProject();
                        }}
                        onCancel={() => setIsIssueDialogOpen(false)}
                    />
                </div>
          </DialogContent>
      </Dialog>
    </>
  );
}
