"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertTriangle, Activity, Battery, BatteryWarning, BatteryFull } from "lucide-react";

interface BurnoutRiskPanelProps {
    workloadPressure: number;
    burnoutRisk: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
    activeEstimatedWorkload: number;
}

export default function BurnoutRiskPanel({ workloadPressure, burnoutRisk, activeEstimatedWorkload }: BurnoutRiskPanelProps) {
    
    const getRiskConfig = () => {
        switch(burnoutRisk) {
            case "CRITICAL": return { color: "bg-rose-500", text: "text-rose-700", border: "border-rose-200", bg: "bg-rose-50", icon: <BatteryWarning className="w-8 h-8 text-rose-600" /> };
            case "HIGH": return { color: "bg-orange-500", text: "text-orange-700", border: "border-orange-200", bg: "bg-orange-50", icon: <BatteryWarning className="w-8 h-8 text-orange-600" /> };
            case "MODERATE": return { color: "bg-amber-400", text: "text-amber-700", border: "border-amber-200", bg: "bg-amber-50", icon: <Battery className="w-8 h-8 text-amber-600" /> };
            default: return { color: "bg-emerald-500", text: "text-emerald-700", border: "border-emerald-200", bg: "bg-emerald-50", icon: <BatteryFull className="w-8 h-8 text-emerald-600" /> };
        }
    };

    const config = getRiskConfig();

    return (
        <Card className={`shadow-sm border ${config.border}`}>
            <CardHeader className={`${config.bg} border-b ${config.border} py-4`}>
                <CardTitle className={`text-sm font-semibold flex items-center gap-2 ${config.text}`}>
                    <AlertTriangle className="w-4 h-4" />
                    Burnout Risk & Capacity
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                
                <div className="flex items-center gap-6">
                    <div className="shrink-0 p-4 rounded-full bg-background shadow-sm border border-border/50">
                        {config.icon}
                    </div>
                    
                    <div className="space-y-1">
                        <div className="text-2xl font-bold tracking-tight">
                            {burnoutRisk} RISK
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {burnoutRisk === "CRITICAL" && "Mathematical certainty of failure. Intervene immediately."}
                            {burnoutRisk === "HIGH" && "Employee is overloaded beyond their remaining weekly capacity."}
                            {burnoutRisk === "MODERATE" && "Approaching maximum healthy output threshold."}
                            {burnoutRisk === "LOW" && "Healthy workload. Optimal capacity utilization."}
                        </p>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-slate-50 border border-border/50 text-center">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Active Queue
                        </div>
                        <div className="text-xl font-bold font-mono">
                            {activeEstimatedWorkload} <span className="text-sm text-muted-foreground font-sans">HRS</span>
                        </div>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-slate-50 border border-border/50 text-center">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Pressure Ratio
                        </div>
                        <div className={`text-xl font-bold font-mono flex items-center justify-center gap-1 ${workloadPressure > 1.0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            <Activity className="w-4 h-4" />
                            {workloadPressure}x
                        </div>
                    </div>
                </div>

                {workloadPressure > 1.0 && (
                    <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 inline mr-1 mb-0.5" />
                        A pressure ratio &gt; 1.0x means this employee has more estimated work assigned to them than mathematically possible to finish this week.
                    </div>
                )}

            </CardContent>
        </Card>
    );
}
