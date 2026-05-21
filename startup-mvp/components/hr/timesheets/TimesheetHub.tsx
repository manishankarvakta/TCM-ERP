"use client";

import { useState } from "react";
import { submitTimesheet } from "@/app/actions/hr/timesheet.action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Clock, Briefcase, FileText, Loader2, CheckCircle2 } from "lucide-react";

export default function TimesheetHub({ projects, tasks }: { projects: any[], tasks: any[] }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        hours: "",
        date: new Date().toISOString().split("T")[0],
        projectId: "",
        taskId: "",
        description: "",
        isBillable: true
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.hours || !formData.projectId || !formData.date) return;
        
        setLoading(true);
        const res = await submitTimesheet({
            hours: parseFloat(formData.hours),
            date: formData.date,
            projectId: formData.projectId,
            taskId: formData.taskId || undefined,
            description: formData.description,
            isBillable: formData.isBillable
        });

        if (res.success) {
            toast.success("Timesheet submitted for approval");
            setFormData(f => ({ ...f, hours: "", description: "" })); // Reset
        } else {
            toast.error(res.error || "Submission failed");
        }
        setLoading(false);
    };

    return (
        <Card className="shadow-sm border-border/50 max-w-xl">
            <CardHeader className="bg-slate-50/50 border-b py-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Log Daily Effort
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                    Log hours spent on specific deliverables. Overtime is inferred automatically.
                </p>
            </CardHeader>
            <CardContent className="p-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</label>
                            <Input 
                                type="date" 
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hours</label>
                            <Input 
                                type="number" 
                                step="0.5" 
                                min="0.5" 
                                max="24"
                                placeholder="e.g. 4.5" 
                                value={formData.hours}
                                onChange={e => setFormData({ ...formData, hours: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5" /> Project
                        </label>
                        <select 
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={formData.projectId}
                            onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                            required
                        >
                            <option value="">Select a Project...</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                        </select>
                    </div>

                    {formData.projectId && (
                        <div className="space-y-1.5 border-l-2 border-primary/20 pl-3 ml-1 mt-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Linked Task (Optional)
                            </label>
                            <select 
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                                value={formData.taskId}
                                onChange={e => setFormData({ ...formData, taskId: e.target.value })}
                            >
                                <option value="">General Project Work</option>
                                {tasks.filter(t => t.projectId === formData.projectId || t.entityId === formData.projectId).map(t => (
                                    <option key={t.id} value={t.id}>{t.title}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" /> Output Description
                        </label>
                        <Input 
                            placeholder="What did you deliver during these hours?" 
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="flex items-center space-x-2 pt-2 pb-1 border-b border-border/30">
                        <Checkbox 
                            id="billable" 
                            checked={formData.isBillable} 
                            onCheckedChange={(c: boolean) => setFormData({ ...formData, isBillable: c })}
                        />
                        <label htmlFor="billable" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Billable to Client
                        </label>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Submit for Approval
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
