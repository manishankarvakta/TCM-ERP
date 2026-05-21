"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DollarSign, AlertCircle } from "lucide-react";

interface BudgetHealthGaugeProps {
    totalBudget: number;
    totalSpend: number;
}

export default function BudgetHealthGauge({ totalBudget, totalSpend }: BudgetHealthGaugeProps) {
    
    const percentageSpent = totalBudget > 0 ? Math.min(100, Math.round((totalSpend / totalBudget) * 100)) : 0;
    const remaining = Math.max(0, totalBudget - totalSpend);
    const isOverrun = totalSpend > totalBudget && totalBudget > 0;

    return (
        <Card className="shadow-sm border-border/50">
            <CardHeader className="bg-slate-50/50 border-b py-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Budget Health & Runway
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                
                {totalBudget === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-sm text-muted-foreground italic py-8">
                        <AlertCircle className="w-6 h-6 mb-2 opacity-50" />
                        No budget allocated for this project.
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-end">
                            <div>
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                    Total Spend
                                </div>
                                <div className={`text-3xl font-bold tracking-tight ${isOverrun ? 'text-rose-600' : 'text-slate-800'}`}>
                                    ${totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                    Remaining
                                </div>
                                <div className="text-xl font-bold text-emerald-600">
                                    ${remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
                                <span>0%</span>
                                <span>{percentageSpent}% Burned</span>
                                <span>100%</span>
                            </div>
                            <Progress 
                                value={percentageSpent} 
                                className={`h-3 ${isOverrun ? '[&>div]:bg-rose-500' : percentageSpent > 80 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`} 
                            />
                        </div>

                        {isOverrun && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 font-medium">
                                <AlertCircle className="w-3.5 h-3.5 inline mr-1 mb-0.5" />
                                Budget overrun detected. Expenses and allocated payroll have exceeded the approved project budget by ${(totalSpend - totalBudget).toLocaleString()}.
                            </div>
                        )}
                    </>
                )}

            </CardContent>
        </Card>
    );
}
