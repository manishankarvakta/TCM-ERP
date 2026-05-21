"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Flame } from "lucide-react";

interface BurndownChartProps {
    totalEstimated: number;
    totalLogged: number;
    remaining: number;
}

export default function BurndownChart({ totalEstimated, totalLogged, remaining }: BurndownChartProps) {
    const data = [
        { name: "Logged Hours (Burned)", value: totalLogged },
        { name: "Remaining Effort", value: remaining }
    ];

    // Warning state if logged hours exceed estimated
    const isBleeding = totalLogged > totalEstimated && totalEstimated > 0;
    const COLORS = [isBleeding ? '#ef4444' : '#3b82f6', '#e5e7eb'];

    return (
        <Card className="shadow-sm border-border/50">
            <CardHeader className="bg-slate-50/50 border-b py-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Flame className={`w-4 h-4 ${isBleeding ? 'text-rose-500' : 'text-primary'}`} />
                    Effort Burndown
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex flex-col items-center justify-center">
                
                {totalEstimated === 0 ? (
                    <div className="w-full h-[200px] flex items-center justify-center text-sm text-muted-foreground italic">
                        No estimated tasks available to chart burndown.
                    </div>
                ) : (
                    <>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value) => [`${value} hrs`, 'Effort']}
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        
                        <div className="mt-4 text-center">
                            <div className="text-3xl font-bold tracking-tight text-slate-800">
                                {totalEstimated} <span className="text-sm font-medium text-muted-foreground">HRS TOTAL</span>
                            </div>
                            {isBleeding && (
                                <p className="text-xs text-rose-600 font-medium mt-1">
                                    Warning: Logged hours have exceeded initial estimates by {totalLogged - totalEstimated} hours.
                                </p>
                            )}
                        </div>
                    </>
                )}

            </CardContent>
        </Card>
    );
}
