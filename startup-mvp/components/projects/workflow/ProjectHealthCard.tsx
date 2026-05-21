"use client";

import { useEffect, useState } from "react";
import { getProjectHealth } from "@/app/actions/projects/workflow.action";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Activity, HeartPulse, Clock, ShieldAlert, BadgeDollarSign } from "lucide-react";

export default function ProjectHealthCard({ projectId }: { projectId: string }) {
    const [health, setHealth] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getProjectHealth(projectId).then(res => {
            if (res.success) setHealth(res.data);
            setLoading(false);
        });
    }, [projectId]);

    if (loading) {
        return (
            <Card className="shadow-sm border-border/50">
                <CardContent className="p-6 flex justify-center items-center h-48">
                    <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
                </CardContent>
            </Card>
        );
    }

    if (!health) return null;

    const getHealthColor = (score: number) => {
        if (score >= 80) return "text-emerald-500";
        if (score >= 50) return "text-amber-500";
        return "text-destructive";
    };

    return (
        <Card className="shadow-sm border-border/50 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b py-3">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    Project Vitality
                    <HeartPulse className={`w-4 h-4 ${getHealthColor(health.healthScore)}`} />
                </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
                
                {/* 1. Overall Health Score */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Health Index</p>
                        <h2 className={`text-4xl font-black tracking-tighter mt-1 ${getHealthColor(health.healthScore)}`}>
                            {health.healthScore}
                        </h2>
                    </div>
                    <div className="text-right">
                        <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-1">Completion</p>
                        <span className="text-xl font-bold">{health.completionPercentage}%</span>
                    </div>
                </div>

                {/* 2. Risk Factors Breakdown */}
                <div className="space-y-3 pt-4 border-t border-border/40">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Risk Vectors</p>
                    
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="font-medium">Schedule Delay Risk</span>
                        </div>
                        <span className={health.metrics.scheduleRisk > 50 ? "text-destructive font-bold" : "text-muted-foreground"}>
                            {health.metrics.scheduleRisk}%
                        </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="font-medium">Dependency Blockers</span>
                        </div>
                        <span className={health.metrics.blockerRisk > 50 ? "text-destructive font-bold" : "text-muted-foreground"}>
                            {health.metrics.blockerRisk}%
                        </span>
                    </div>

                    {health.metrics.financialRisk !== null && (
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <BadgeDollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="font-medium">Financial Burn Rate</span>
                            </div>
                            <span className={health.metrics.financialRisk > 80 ? "text-destructive font-bold" : "text-emerald-600 font-bold"}>
                                {health.metrics.financialRisk}%
                            </span>
                        </div>
                    )}
                </div>

                {/* 3. Progress Bar */}
                <Progress value={health.completionPercentage} className="h-1.5" />
            </CardContent>
        </Card>
    );
}
