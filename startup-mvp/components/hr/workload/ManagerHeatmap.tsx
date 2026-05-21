"use client";

import { useEffect, useState } from "react";
import { getTeamWorkloadMetrics } from "@/app/actions/hr/workload.action";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle } from "lucide-react";

export function ManagerHeatmap() {
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTeamWorkloadMetrics().then((res) => {
      if (res.success && res.data) setTeam(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
  if (!team.length) return <div className="p-4 text-muted-foreground">No active employees found.</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Workload Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {team.map((emp) => (
            <div key={emp.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                <div>
                  <div className="font-medium">{emp.name}</div>
                  <div className="text-xs text-muted-foreground">{emp.department || "No Department"}</div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {emp.burnoutRisk && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Risk Detected
                  </Badge>
                )}

                <div className="text-right min-w-[100px]">
                  <div className="text-sm font-semibold">{Math.round(emp.workloadRatio)}% Capacity</div>
                  <div className="mt-1 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${emp.workloadRatio > 90 ? 'bg-destructive' : emp.workloadRatio < 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(emp.workloadRatio, 100)}%` }}
                    />
                  </div>
                </div>
                
                <Badge variant={emp.status === "OPTIMAL" ? "default" : emp.status === "OVERLOADED" ? "destructive" : "secondary"}>
                  {emp.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
