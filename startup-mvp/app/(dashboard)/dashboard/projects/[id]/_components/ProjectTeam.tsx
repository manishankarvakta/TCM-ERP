import React, { useState, useTransition, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { updateProject, addProjectMember, removeProjectMember } from "@/app/actions/projects/project.action";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, Crown, Briefcase, CheckCircle2, Circle, Mail, ShieldAlert, Sparkles, Map as MapIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface ProjectTeamProps {
    projectId: string;
    project: any;
    tasks?: any[];
    users?: any[];
    onRefresh: () => void;
}

export function ProjectTeam({ projectId, project, tasks = [], users = [], onRefresh }: ProjectTeamProps) {
    const [isPending, startTransition] = useTransition();
    const [allocations, setAllocations] = useState<Record<string, number>>({});
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [selectedMemberId, setSelectedMemberId] = useState("");

    // Compute unique contributors organically
    const contributors = useMemo(() => {
        const memberMap = new Map<string, any>();
        
        // 1. Owner
        if (project?.Owner) {
            memberMap.set(project.Owner.id, {
                ...project.Owner,
                systemRole: "Owner",
                isOwner: true
            });
        }
        
        // 2. Project Manager
        if (project?.projectManagerId) {
            const pmUser = users.find(u => u.id === project.projectManagerId);
            if (pmUser) {
                if (!memberMap.has(pmUser.id)) {
                    memberMap.set(pmUser.id, {
                        ...pmUser,
                        systemRole: "Project Manager",
                        isPM: true
                    });
                } else {
                    const existing = memberMap.get(pmUser.id);
                    existing.isPM = true;
                    if (existing.systemRole !== "Owner") {
                        existing.systemRole = "Project Manager";
                    }
                }
            }
        }
        
        // 3. Task Assignees
        tasks.forEach(t => {
            if (t.assigneeId) {
                if (!memberMap.has(t.assigneeId)) {
                    const tUser = users.find(u => u.id === t.assigneeId);
                    if (tUser) {
                        memberMap.set(t.assigneeId, {
                            ...tUser,
                            systemRole: "Contributor"
                        });
                    }
                }
            }
        });

        // 4. Manually Associated Team Members
        if (project?.teamMembers) {
            project.teamMembers.forEach((member: any) => {
                if (!memberMap.has(member.id)) {
                    memberMap.set(member.id, {
                        ...member,
                        systemRole: "Contributor"
                    });
                }
            });
        }
        
        return Array.from(memberMap.values());
    }, [project, tasks, users]);

    // Derived Metrics
    const getUserMetrics = (userId: string) => {
        const userTasks = tasks.filter(t => t.assigneeId === userId);
        const completedTasks = userTasks.filter(t => t.status === "COMPLETED" || t.status === "done" || t.status === "completed").length;
        const totalTasks = userTasks.length;
        const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        return { completedTasks, totalTasks, progress };
    };

    const overallTasks = tasks.length;
    const overallCompleted = tasks.filter(t => t.status === "COMPLETED" || t.status === "done" || t.status === "completed").length;
    const overallProgress = overallTasks > 0 ? Math.round((overallCompleted / overallTasks) * 100) : 0;

    const handlePMChange = (newUserId: string) => {
        const idToSave = newUserId === "none" ? null : newUserId;
        startTransition(async () => {
            const res = await updateProject(projectId, { projectManagerId: idToSave as any });
            if (res.success) {
                toast.success(idToSave ? "Project Manager Assigned" : "Project Manager Removed");
                onRefresh();
            } else {
                toast.error(res.error || "Failed to update project manager");
            }
        });
    };

    const handleAllocationChange = (userId: string, val: number[]) => {
        setAllocations(prev => ({ ...prev, [userId]: val[0] }));
    };

    const handleAddMember = () => {
        if (!selectedMemberId) return;
        startTransition(async () => {
            const res = await addProjectMember(projectId, selectedMemberId);
            if (res.success) {
                toast.success("Team member added successfully");
                setIsAddOpen(false);
                setSelectedMemberId("");
                onRefresh();
            } else {
                toast.error(res.error || "Failed to add team member");
            }
        });
    };

    const handleRemoveMember = (userId: string) => {
        startTransition(async () => {
            const res = await removeProjectMember(projectId, userId);
            if (res.success) {
                toast.success("Team member removed successfully");
                onRefresh();
            } else {
                toast.error(res.error || "Failed to remove team member");
            }
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Top Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="rounded-xl border border-border/50 shadow-sm bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-card overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Active Members</p>
                                <h3 className="text-3xl font-bold mt-1 text-indigo-700 dark:text-indigo-400">{contributors.length}</h3>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <Users className="h-6 w-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-xl border border-border/50 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-card overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Overall Progress</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <h3 className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{overallProgress}%</h3>
                                    <span className="text-sm font-medium text-emerald-600/70">completion</span>
                                </div>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <Sparkles className="h-6 w-6" />
                            </div>
                        </div>
                        <Progress value={overallProgress} className="h-1.5 mt-4 bg-emerald-100 dark:bg-emerald-950" indicatorClassName="bg-emerald-500" />
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 rounded-xl border border-border/50 shadow-sm bg-card overflow-visible">
                    <CardContent className="p-6">
                         <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                    <ShieldAlert className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Project Manager Assignment</p>
                                    <h3 className="text-lg font-bold">Strategic Lead</h3>
                                </div>
                            </div>
                            
                            <div className="w-full sm:w-[250px]">
                                <Select 
                                    value={project?.projectManagerId || "none"} 
                                    onValueChange={handlePMChange}
                                    disabled={isPending}
                                >
                                    <SelectTrigger className="w-full h-11 bg-muted/30 font-medium">
                                        <SelectValue placeholder="Assign a Manager..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none" className="text-muted-foreground italic">No manager assigned</SelectItem>
                                        {users.map((u: any) => (
                                            <SelectItem key={u.id} value={u.id}>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarImage src={u.image || ""} />
                                                        <AvatarFallback>{u.name?.charAt(0) || "U"}</AvatarFallback>
                                                    </Avatar>
                                                    {u.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Contributor Grid */}
            <div>
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">Active Contributors</h2>
                        <p className="text-sm text-muted-foreground">Team members organically derived from mission assignments and ownership roles.</p>
                    </div>
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Add Team Member
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add Team Member</DialogTitle>
                                <DialogDescription>
                                    Add a member manually to this project team.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="memberSelect">Select Member</Label>
                                    <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                                        <SelectTrigger id="memberSelect" className="w-full">
                                            <SelectValue placeholder="Select a user..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users
                                                .filter((u: any) => !contributors.some((c: any) => c.id === u.id))
                                                .map((u: any) => (
                                                    <SelectItem key={u.id} value={u.id}>
                                                        {u.name || u.email}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                                <Button onClick={handleAddMember} disabled={!selectedMemberId || isPending}>
                                    {isPending ? "Adding..." : "Add Member"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {contributors.map((member) => {
                        const metrics = getUserMetrics(member.id);
                        const currentAllocation = allocations[member.id] !== undefined ? allocations[member.id] : (member.isPM ? 100 : member.isOwner ? 20 : 40);
                        
                        return (
                            <Card key={member.id} className="rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden hover:shadow-md transition-all group">
                                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/20 pb-4 border-b">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-12 w-12 border-2 border-background shadow-sm group-hover:scale-105 transition-transform">
                                                <AvatarImage src={member.image || ""} />
                                                <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                                                    {member.name?.charAt(0) || "U"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h4 className="font-bold text-base leading-tight">{member.name}</h4>
                                                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                                    <Mail className="h-3 w-3" />
                                                    <span className="truncate max-w-[140px]">{member.email}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between gap-2 w-full">
                                        <div className="flex flex-wrap gap-2">
                                            {member.isOwner && (
                                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
                                                    <Crown className="w-3 h-3 mr-1" /> Project Owner
                                                </Badge>
                                            )}
                                            {member.isPM && (
                                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
                                                    <ShieldAlert className="w-3 h-3 mr-1" /> Manager
                                                </Badge>
                                            )}
                                            {!member.isOwner && !member.isPM && (
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                    <Briefcase className="w-3 h-3 mr-1" /> Contributor
                                                </Badge>
                                            )}
                                        </div>
                                        {project.teamMembers?.some((m: any) => m.id === member.id) && !member.isOwner && !member.isPM && (
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-full"
                                                onClick={() => handleRemoveMember(member.id)}
                                                disabled={isPending}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-5 space-y-6">
                                    
                                    {/* Task Metrics */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm font-medium">
                                            <span className="text-muted-foreground flex items-center gap-1">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                Deliverables Progress
                                            </span>
                                            <span>{metrics.completedTasks} / {metrics.totalTasks}</span>
                                        </div>
                                        <Progress value={metrics.progress} className="h-2" />
                                    </div>

                                    {/* Simulated Workload Widget */}
                                    <div className="pt-4 border-t border-border/50">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                                <MapIcon className="w-4 h-4" />
                                                Weekly Allocation
                                            </span>
                                            <span className="text-sm font-bold">{currentAllocation}%</span>
                                        </div>
                                        <Slider 
                                            value={[currentAllocation]} 
                                            max={100} 
                                            step={10}
                                            onValueChange={(val) => handleAllocationChange(member.id, val)}
                                            className="w-full"
                                        />
                                    </div>

                                </CardContent>
                            </Card>
                        );
                    })}

                    {/* Empty State Add Card */}
                    {contributors.length === 0 && (
                        <div className="col-span-full py-12 text-center rounded-xl border border-dashed border-border bg-slate-50/50 dark:bg-slate-900/10">
                            <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="h-8 w-8" />
                            </div>
                            <h3 className="text-lg font-bold">No Team Members Yet</h3>
                            <p className="text-muted-foreground max-w-md mx-auto mt-2 mb-6">
                                The team automatically populates when you assign tasks and issues to your organization members.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
