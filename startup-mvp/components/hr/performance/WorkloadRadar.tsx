"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, Clock, TrendingUp } from "lucide-react";

interface WorkloadRadarProps {
    estimationAccuracy: number;
    deadlineAccuracy: number;
}

export default function WorkloadRadar({ estimationAccuracy, deadlineAccuracy }: WorkloadRadarProps) {
    return (
        <Card className="shadow-sm border-border/50">
            <CardHeader className="bg-slate-50/50 border-b py-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Delivery Precision (The Drift Score)
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-medium flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" /> Estimation Accuracy
                        </span>
                        <span className={`font-bold ${estimationAccuracy >= 80 ? 'text-emerald-600' : estimationAccuracy >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                            {estimationAccuracy}%
                        </span>
                    </div>
                    <Progress value={estimationAccuracy} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                        Measures how closely the employee's logged timesheets match their predicted task estimates.
                    </p>
                </div>

                <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-medium flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-muted-foreground" /> Deadline Hit Rate
                        </span>
                        <span className={`font-bold ${deadlineAccuracy >= 90 ? 'text-emerald-600' : deadlineAccuracy >= 75 ? 'text-amber-600' : 'text-rose-600'}`}>
                            {deadlineAccuracy}%
                        </span>
                    </div>
                    <Progress value={deadlineAccuracy} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                        Percentage of tasks mathematically completed before their assigned due dates.
                    </p>
                </div>

            </CardContent>
        </Card>
    );
}
