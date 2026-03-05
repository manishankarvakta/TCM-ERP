"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
    Plus, 
    Search, 
    Filter, 
    MoreHorizontal, 
    TrendingUp, 
    CheckCircle2, 
    Clock, 
    AlertCircle,
    ArrowUpRight
} from "lucide-react";
import { 
    getProjects, 
    updateProject 
} from "@/app/actions/projects/project.action";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import ProjectForm from "@/components/projects/ProjectForm";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { toast } from "sonner";

export default function ProjectManager() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const result = await getProjects();
      if (result.success) {
        setProjects(result.projects || []);
      }
    } catch (err) {
      console.error("Fetch projects error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleStatusChange = async (id: string, status: string) => {
    const result = await updateProject(id, { status });
    if (result.success) {
        toast.success(`Project status updated to ${status}`);
        fetchProjects();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PLANNING": return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Planning</Badge>;
      case "ACTIVE": return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse">Active</Badge>;
      case "ON_HOLD": return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">On Hold</Badge>;
      case "COMPLETED": return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Completed</Badge>;
      case "CANCELLED": return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 p-2 opacity-10">
                  <TrendingUp className="h-12 w-12" />
              </div>
              <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted-foreground group">Total Projects</p>
                      <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-3xl font-bold tracking-tight">{projects.length}</h3>
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Active workspace ecosystem</p>
              </CardContent>
          </Card>
          <Card className="border-emerald-100 bg-emerald-50/20 shadow-sm">
              <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted-foreground">Active</p>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <h3 className="text-3xl font-bold tracking-tight">{projects.filter(p => p.status === "ACTIVE").length}</h3>
                  <p className="text-[10px] text-emerald-600 mt-1 uppercase tracking-wider font-semibold">Currently In Progress</p>
              </CardContent>
          </Card>
          <Card className="shadow-sm border-blue-100 bg-blue-50/20">
              <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted-foreground">Planning</p>
                      <Clock className="h-4 w-4 text-blue-500" />
                  </div>
                  <h3 className="text-3xl font-bold tracking-tight">{projects.filter(p => p.status === "PLANNING").length}</h3>
                  <p className="text-[10px] text-blue-600 mt-1 uppercase tracking-wider font-semibold">Scheduled Pipeline</p>
              </CardContent>
          </Card>
          <Card className="border-rose-100 bg-rose-50/20 shadow-sm">
              <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted-foreground">At Risk</p>
                      <AlertCircle className="h-4 w-4 text-rose-500" />
                  </div>
                  <h3 className="text-3xl font-bold tracking-tight">{projects.filter(p => p.priority === "CRITICAL").length}</h3>
                  <p className="text-[10px] text-rose-600 mt-1 uppercase tracking-wider font-semibold">Needs Immediate Attention</p>
              </CardContent>
          </Card>
      </div>

      {/* Main Content Actions */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <input
            placeholder="Search projects by title, client..."
            className="w-full bg-background border border-border/60 rounded-full py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none h-10 px-5 rounded-full border-muted-foreground/20 hover:bg-muted transition-all">
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
          <Button 
            className="flex-1 md:flex-none h-10 px-6 rounded-full shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all active:scale-95 text-sm font-semibold"
            onClick={() => {
                setSelectedProject(null);
                setIsDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Launch Project
          </Button>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="py-24 text-center border-2 border-dashed rounded-[2rem] bg-muted/20 border-border/80 group hover:border-primary/20 transition-all duration-500">
            <div className="relative mx-auto mb-6 w-16 h-16 flex items-center justify-center rounded-2xl bg-primary/5 group-hover:scale-110 transition-transform duration-500">
                <Plus className="h-8 w-8 text-primary/40" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight">Expand your ecosystem</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
                Launch your first project to start tracking milestones, issues, and tool integrations within your centralized workspace.
            </p>
            <Button className="mt-8 px-8 h-12 rounded-full font-bold shadow-xl shadow-primary/20 transition-all" onClick={() => setIsDialogOpen(true)}>
                Start Now
            </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project) => (
            <Card key={project.id} className="group relative overflow-hidden hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-500 border-border/50 bg-card rounded-2xl">
              <CardContent className="p-0">
                  <div className="p-7">
                    <div className="flex items-start justify-between mb-6">
                        {getStatusBadge(project.status)}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-muted/50 hover:bg-muted">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 p-2 rounded-xl">
                                <DropdownMenuItem className="rounded-lg cursor-pointer py-2.5" onClick={() => {
                                    setSelectedProject(project);
                                    setIsDialogOpen(true);
                                }}>Edit Overview</DropdownMenuItem>
                                <DropdownMenuItem className="rounded-lg cursor-pointer py-2.5 text-primary font-medium" onClick={() => handleStatusChange(project.id, "ACTIVE")}>Promote to Active</DropdownMenuItem>
                                <DropdownMenuItem className="rounded-lg cursor-pointer py-2.5 text-emerald-600 font-medium" onClick={() => handleStatusChange(project.id, "COMPLETED")}>Finalize Completion</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="mb-5">
                        <Link href={`/dashboard/projects/${project.id}`} className="block group/link">
                            <h4 className="text-xl font-extrabold tracking-tight group-hover/link:text-primary transition-colors flex items-center gap-2 mb-1">
                                {project.title}
                                <ArrowUpRight className="h-5 w-5 opacity-0 group-hover/link:opacity-100 transition-all -translate-y-2 group-hover/link:translate-y-0 text-primary" />
                            </h4>
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-full bg-muted overflow-hidden">
                                <Avatar className="h-full w-full">
                                    <AvatarImage src={project.Client?.image} />
                                    <AvatarFallback className="text-[8px]">{project.Client?.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </div>
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                {project.Client?.name || "Independent"}
                            </span>
                        </div>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-8 leading-relaxed font-medium">
                        {project.description || "Project currently in the scoping phase within our centralized ecosystem."}
                    </p>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                            <span className="text-muted-foreground/60">Milestone Progress</span>
                            <span className="text-primary">35%</span>
                        </div>
                        <Progress value={35} className="h-2 rounded-full bg-muted/80" />
                    </div>
                  </div>

                  <div className="bg-muted/30 p-5 px-7 border-t border-border/40 flex items-center justify-between">
                      <div className="flex -space-x-3">
                          <Avatar className="h-8 w-8 border-2 border-background ring-1 ring-border shadow-sm">
                              <AvatarImage src={project.Owner?.image} />
                              <AvatarFallback className="text-[10px] bg-primary text-primary-foreground font-bold">{project.Owner?.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <Avatar className="h-8 w-8 border-2 border-background ring-1 ring-border shadow-sm bg-slate-100">
                                <AvatarFallback className="text-[9px] font-bold text-slate-500 bg-slate-100">+2</AvatarFallback>
                          </Avatar>
                      </div>
                      <div className="flex items-center gap-5 text-xs font-bold text-muted-foreground/70 uppercase tracking-tighter">
                          <span className="flex items-center gap-2 bg-background/60 px-2 py-1 rounded-md border border-border/20 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> {project._count.Milestones} Milestones
                          </span>
                      </div>
                  </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Project Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[650px] border-none shadow-2xl overflow-hidden p-0 rounded-3xl">
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 border-b border-primary/5">
                    <DialogHeader>
                        <DialogTitle className="text-3xl font-black tracking-tight flex items-center gap-3">
                            {selectedProject ? "Edit Project Overview" : "Launch Project"}
                        </DialogTitle>
                        <DialogDescription className="text-base font-medium text-muted-foreground mt-2 max-w-sm">
                            Configure your project objectives and link necessary CRM resources for unified tracking.
                        </DialogDescription>
                    </DialogHeader>
                </div>
                <div className="px-8 py-6">
                    <ProjectForm 
                        initialData={selectedProject}
                        onSuccess={() => {
                            setIsDialogOpen(false);
                            fetchProjects();
                        }}
                        onCancel={() => setIsDialogOpen(false)}
                    />
                </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}
