"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
import ProjectIssuesKanban from "./ProjectIssuesKanban";
import IssueActivityWrapper from "./IssueActivityWrapper";
import ProjectAnalytics from "./ProjectAnalytics";
import { ProjectTimeline } from "./ProjectTimeline";
import { ProjectCalendar } from "./ProjectCalendar";
import { ProjectTeam } from "./ProjectTeam";
import { ClickUpItemModal } from "@/components/projects/shared/ClickUpItemModal";
import { Switch } from "@/components/ui/switch";
import { AdminProjectOverview } from "./AdminProjectOverview";
import { MemberProjectOverview } from "./MemberProjectOverview";
import NoteManager from "@/app/(dashboard)/dashboard/crm/activities/_components/NoteManager";
import DocManager from "@/app/(dashboard)/dashboard/crm/activities/_components/DocManager";
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
  userRole?: string;
  userId?: string;
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

export default function ProjectWorkspace({ id, permissions = {}, userRole, userId, initialData }: ProjectWorkspaceProps) {
  const hasOp = useCallback((key: string, op: Operation) => {
    if (userRole?.toLowerCase() === "admin") return true;
    const perm = permissions[key] as any;
    if (Array.isArray(perm)) {
      return perm.includes(op);
    }
    if (perm && typeof perm === "object" && Array.isArray(perm.operations)) {
      return perm.operations.includes(op);
    }
    return false;
  }, [permissions, userRole]);
  
  const [project, setProject] = useState<any>(initialData.project);
  const [loading, setLoading] = useState(false);
  const activities = initialData.allActivities;
  const tasks = initialData.tasks;
  const notes = initialData.notes;
  const docs = initialData.docs;
  const events = initialData.events;
  const users = initialData.users;

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Read initial tab from URL, fallback to first visible tab
  const getInitialTab = () => searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [isTabSettingsOpen, setIsTabSettingsOpen] = useState(false);
  const [hiddenTabs, setHiddenTabs] = useState<string[]>([]);
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

  useEffect(() => {
    const saved = localStorage.getItem(`project-tabs-${id}`);
    if (saved) {
      try {
        setHiddenTabs(JSON.parse(saved));
      } catch (e) {}
    }
  }, [id]);

  const toggleTabVisibility = (tabId: string) => {
    setHiddenTabs(prev => {
      const next = prev.includes(tabId) ? prev.filter(t => t !== tabId) : [...prev, tabId];
      localStorage.setItem(`project-tabs-${id}`, JSON.stringify(next));
      return next;
    });
  };

  // Sync active tab to URL without adding browser history entries
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

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

  const availableTabs = [
    { id: "overview", label: "Overview", icon: FiLayout, permission: "projects.projects" },
    { id: "timeline", label: "Timeline", icon: FiMap, permission: "projects.timeline" },
    { id: "kanban", label: "Issues", icon: FiActivity, permission: "projects.issues" },
    { id: "calendar", label: "Calendar", icon: FiClock, permission: "projects.calendar" },
    { id: "notes", label: "Notes", icon: FiFileText, permission: "projects.notes" },
    { id: "docs", label: "Docs", icon: FiBriefcase, permission: "projects.docs" },
    { id: "files", label: "Files", icon: FiPaperclip, permission: "projects.files" },
    { id: "activities", label: "Activities", icon: FiMessageSquare, permission: "projects.activities" },
    { id: "team", label: "Team", icon: FiUsers, permission: "projects.team" }
  ].filter(tab => hasOp(tab.permission, "view"));

  const visibleTabs = availableTabs.filter(tab => !hiddenTabs.includes(tab.id));
  // Resolve the active tab: prefer URL param if it's visible, otherwise fall back to first visible
  const resolvedTab = visibleTabs.find(t => t.id === activeTab)
    ? activeTab
    : (visibleTabs[0]?.id ?? "overview");

  return (
    <>
    <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {/* Main Content: Tabs */}
      <div className="space-y-6">
      <Tabs value={resolvedTab} onValueChange={handleTabChange} className="w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/40 pb-2">
            <TabsList className="bg-transparent p-0 rounded-none h-auto border-none flex shadow-none gap-1 overflow-x-auto justify-start flex-1 w-full md:mr-8">
        {visibleTabs.map((tab) => (
            <TabsTrigger 
                key={tab.id}
                value={tab.id} 
                className="justify-start rounded-none bg-transparent border-none px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary font-semibold capitalize gap-2 hover:text-primary transition-all relative group flex items-center h-12 whitespace-nowrap"
            >
                <tab.icon className="h-4 w-4" />
                {tab.label}
            </TabsTrigger>
        ))}
    </TabsList>
    <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold hover:bg-muted active:scale-95" onClick={fetchProject}>
            <FiActivity className="mr-2 h-3.5 w-3.5 text-primary" /> Sync
        </Button>
         {hasOp("projects.projects", "edit") && (
            <Button variant="outline" size="sm" className="h-8 px-4 font-semibold hover:bg-muted active:scale-95 shadow-sm text-xs" onClick={() => setIsTabSettingsOpen(true)}>
                <FiSettings className="mr-2 h-3.5 w-3.5" /> Options
            </Button>
        )}
    </div>
</div>

        <TabsContent value="overview" className="mt-0 focus-visible:ring-0">
          {["admin", "manager", "teamleader"].includes(userRole?.toLowerCase() || "") ? (
              <AdminProjectOverview project={project} tasks={tasks} />
          ) : (
              <MemberProjectOverview project={project} tasks={tasks} userId={userId || ""} events={events} />
          )}
        </TabsContent>

        <TabsContent value="timeline" className="mt-0 focus-visible:ring-0">
             <Card className="rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b py-6 flex gap-4 flex-col md:flex-row md:items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-bold">Project Timeline</CardTitle>
                        <CardDescription className="text-sm font-medium mt-1">
                            Milestone sequence and interactive Gantt schedule.
                        </CardDescription>
                    </div>
                    {hasOp("projects.milestones", "create") && (
                      <Button 
                          onClick={() => {
                              setSelectedMilestone(null);
                              setIsMilestoneDialogOpen(true);
                          }}
                      >
                          <Plus className="mr-2 h-4 w-4" /> Add Milestone
                      </Button>
                    )}
                </CardHeader>
                <CardContent className="p-6">
                    <ProjectTimeline projectId={id} />
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
                    <ProjectIssuesKanban 
                        project={project}
                        users={users}
                        onRefresh={fetchProject}
                        onEditIssue={(issue: any) => {
                            setSelectedIssue(issue);
                            setSelectedMilestone(project.Milestones?.find((m: any) => m.id === issue.milestoneId));
                            setIsIssueDialogOpen(true);
                        }}
                        onDeleteIssue={handleDeleteIssue}
                        hasOp={hasOp}
                    />
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

        <TabsContent value="calendar" className="mt-0 focus-visible:ring-0">
            <ProjectCalendar projectId={id} />
        </TabsContent>

        <TabsContent value="notes" className="mt-0 focus-visible:ring-0">
            <div className="bg-card rounded-xl border border-border/50 shadow-sm p-4">
                <NoteManager entityId={id} entityType="project" notes={notes} />
            </div>
        </TabsContent>

        <TabsContent value="docs" className="mt-0 focus-visible:ring-0">
            <div className="bg-card rounded-xl border border-border/50 shadow-sm p-4">
                <DocManager entityId={id} entityType="project" docs={docs} />
            </div>
        </TabsContent>

        <TabsContent value="team" className="mt-0 focus-visible:ring-0">
            <ProjectTeam 
                projectId={id} 
                project={project}
                tasks={tasks}
                users={users}
                onRefresh={fetchProject}
            />
        </TabsContent>
      </Tabs>
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

      {/* Unified ClickUp-Style Issue Dialog for existing, or standard IssueForm for new */}
      {isIssueDialogOpen && (
          selectedIssue ? (
              <ClickUpItemModal 
                  isOpen={isIssueDialogOpen}
                  onClose={() => setIsIssueDialogOpen(false)}
                  entityType="issue"
                  initialData={selectedIssue}
                  users={users}
                  onRefresh={fetchProject}
              />
          ) : (
              <Dialog open={isIssueDialogOpen} onOpenChange={setIsIssueDialogOpen}>
                  <DialogContent className="sm:max-w-[600px] p-6 rounded-xl bg-background border-border/50 shadow-lg">
                        <div className="border-b pb-4 mb-4">
                            <DialogTitle className="text-xl font-bold">Log Issue</DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground mt-1">
                                Log a new technical issue mapped to this project milestone.
                            </DialogDescription>
                        </div>
                        <div className="bg-card">
                            <IssueForm 
                                milestones={project.Milestones || []}
                                defaultMilestoneId={selectedMilestone?.id || ""}
                                onSuccess={() => {
                                    setIsIssueDialogOpen(false);
                                    fetchProject();
                                }}
                                onCancel={() => setIsIssueDialogOpen(false)}
                            />
                        </div>
                  </DialogContent>
              </Dialog>
          )
      )}
      {/* Tab Settings Dialog */}
      <Dialog open={isTabSettingsOpen} onOpenChange={setIsTabSettingsOpen}>
          <DialogContent className="sm:max-w-[400px] p-6 rounded-xl bg-background border-border/50 shadow-lg">
                <div className="border-b pb-4 mb-4">
                    <DialogTitle className="text-xl font-bold">Workspace View Settings</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground mt-1">
                        Select which of your permitted tabs are visible in this workspace.
                    </DialogDescription>
                </div>
                <div className="bg-card space-y-3">
                    {availableTabs.map((tab) => (
                        <div key={tab.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                            <label htmlFor={`tab-${tab.id}`} className="flex items-center gap-2 cursor-pointer font-medium text-sm flex-1">
                                <tab.icon className="w-4 h-4 text-muted-foreground" />
                                {tab.label}
                            </label>
                            <Switch 
                                id={`tab-${tab.id}`}
                                checked={!hiddenTabs.includes(tab.id)}
                                onCheckedChange={() => toggleTabVisibility(tab.id)}
                            />
                        </div>
                    ))}
                </div>
          </DialogContent>
      </Dialog>
    </>
  );
}
