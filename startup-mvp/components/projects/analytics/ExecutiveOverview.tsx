"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertOctagon, TrendingUp, Briefcase } from "lucide-react";

interface ExecutiveOverviewProps {
    globalDelayRisks: { id: string; title: string; dueDate: Date | null; estimatedHours: number | null }[];
    totalActiveProjects: number;
    globalConversionRate: number;
}

export default function ExecutiveOverview({ globalDelayRisks, totalActiveProjects, globalConversionRate }: ExecutiveOverviewProps) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-semibold tracking-tight">Executive Portfolio Overview</h2>
                <p className="text-sm text-muted-foreground">
                    Macroscopic insights into global delay risks, active pipeline volume, and overall health.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Global Stats */}
                <Card className="shadow-sm border-border/50">
                    <CardHeader className="bg-slate-50/50 border-b py-4">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-primary" />
                            Active Portfolio
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="text-3xl font-bold tracking-tight">
                            {totalActiveProjects}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Concurrent projects running across all departments.
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-border/50">
                    <CardHeader className="bg-slate-50/50 border-b py-4">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                            Global Conversion Rate
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="text-3xl font-bold tracking-tight text-emerald-700">
                            {globalConversionRate.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Sales-to-Project win ratio.
                        </p>
                    </CardContent>
                </Card>

                {/* Delay Risks (Span 1 col on Desktop, full width on mobile) */}
                <Card className="shadow-sm border-rose-200 lg:col-span-1 md:col-span-2">
                    <CardHeader className="bg-rose-50 border-b border-rose-100 py-4">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-rose-800">
                            <AlertOctagon className="w-4 h-4 text-rose-600" />
                            Global Imminent Delay Risks
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {globalDelayRisks.length === 0 ? (
                            <div className="p-6 text-sm text-muted-foreground italic text-center">
                                No imminent delay risks detected globally.
                            </div>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {globalDelayRisks.map(task => (
                                    <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-sm font-medium leading-none">{task.title}</span>
                                            <Badge variant="destructive" className="text-[10px]">RISK</Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-2 flex justify-between">
                                            <span>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</span>
                                            <span className="font-mono">{task.estimatedHours}h Est.</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
