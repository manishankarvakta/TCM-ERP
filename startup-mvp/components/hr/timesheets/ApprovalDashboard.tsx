"use client";

import { useState } from "react";
import { approveTimesheet } from "@/app/actions/hr/timesheet.action";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, ShieldCheck, Loader2 } from "lucide-react";

export default function ApprovalDashboard({ pendingTimesheets, onRefresh }: { pendingTimesheets: any[], onRefresh: () => void }) {
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleApproval = async (id: string, status: "APPROVED" | "REJECTED") => {
        setProcessingId(id);
        const res = await approveTimesheet(id, status);
        
        if (res.success) {
            toast.success(`Timesheet ${status.toLowerCase()} successfully`);
            onRefresh();
        } else {
            toast.error(res.error || "Failed to process timesheet");
        }
        setProcessingId(null);
    };

    return (
        <Card className="shadow-sm border-border/50">
            <CardHeader className="bg-slate-50/50 border-b py-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    Manager Approval Queue
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                    Review and authorize employee output logs. Approved logs will feed into the Project Burn Rate.
                </p>
            </CardHeader>
            <CardContent className="p-0">
                {pendingTimesheets.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground italic">
                        No pending timesheets in your queue.
                    </div>
                ) : (
                    <div className="divide-y divide-border/40">
                        {pendingTimesheets.map(ts => (
                            <div key={ts.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                                
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm">{ts.Employee?.firstName} {ts.Employee?.lastName}</span>
                                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                            {ts.hours} HRS
                                        </Badge>
                                        {ts.isBillable && (
                                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px] uppercase">
                                                Billable
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        <span className="font-medium">{new Date(ts.date).toLocaleDateString()}</span> • {ts.Project?.title}
                                    </div>
                                    {ts.description && (
                                        <p className="text-xs italic bg-muted/50 p-2 rounded mt-2 border border-border/50">
                                            "{ts.description}"
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50"
                                        onClick={() => handleApproval(ts.id, "REJECTED")}
                                        disabled={processingId !== null}
                                    >
                                        {processingId === ts.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-4 h-4 mr-1" />} Reject
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        className="h-8 bg-emerald-600 hover:bg-emerald-700"
                                        onClick={() => handleApproval(ts.id, "APPROVED")}
                                        disabled={processingId !== null}
                                    >
                                        {processingId === ts.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-4 h-4 mr-1" />} Approve
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
