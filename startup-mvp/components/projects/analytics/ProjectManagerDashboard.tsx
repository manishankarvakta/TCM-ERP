"use client";

import VelocityTracker from "./VelocityTracker";
import BurndownChart from "./BurndownChart";
import BudgetHealthGauge from "./BudgetHealthGauge";

interface ProjectManagerDashboardProps {
    velocityData: { name: string; velocity: number }[];
    burndownData: { totalEstimated: number; totalLogged: number; remaining: number };
    financialData: { totalBudget: number; totalSpend: number };
}

export default function ProjectManagerDashboard({ velocityData, burndownData, financialData }: ProjectManagerDashboardProps) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-semibold tracking-tight">Project Health Dashboard</h2>
                <p className="text-sm text-muted-foreground">
                    Operational analytics detailing sprint velocity, effort burndown, and budget limits.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Span 2 cols for wide velocity chart */}
                <div className="lg:col-span-2">
                    <VelocityTracker data={velocityData} />
                </div>

                <div className="space-y-6">
                    <BurndownChart 
                        totalEstimated={burndownData.totalEstimated} 
                        totalLogged={burndownData.totalLogged} 
                        remaining={burndownData.remaining} 
                    />
                    <BudgetHealthGauge 
                        totalBudget={financialData.totalBudget} 
                        totalSpend={financialData.totalSpend} 
                    />
                </div>

            </div>
        </div>
    );
}
