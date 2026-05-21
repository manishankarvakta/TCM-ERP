"use client";

import { useEffect, useState } from "react";
import { getMyWorkloadMetrics } from "@/app/actions/hr/workload.action";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Flame, Loader2 } from "lucide-react";

export function EmployeeWorkloadGauge() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyWorkloadMetrics().then((res) => {
      if (res.success) setMetrics(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
  if (!metrics) return <div className="p-4 text-destructive">Failed to load workload metrics.</div>;

  const { capacity, workload, burnout, accuracy } = metrics;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Capacity & Workload Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Current Workload</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Math.round(workload.workloadRatio)}%</div>
          <div className="text-xs text-muted-foreground mt-1">
            {workload.outstandingHours} hrs outstanding / {capacity.trueCapacityHours} hrs capacity
          </div>
          <div className="mt-4 h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div 
              className={`h-full ${workload.workloadRatio > 90 ? 'bg-destructive' : workload.workloadRatio < 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(workload.workloadRatio, 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Estimation Accuracy Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Estimation Accuracy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">{accuracy ? `${Math.round(accuracy)}%` : 'N/A'}</div>
            {accuracy && accuracy > 80 && <CheckCircle2 className="w-5 h-5 text-green-500" />}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Target: &gt;80% accuracy on closed issues.
          </div>
        </CardContent>
      </Card>

      {/* Burnout Risk Card */}
      <Card className={burnout.length > 0 ? "border-destructive/50 bg-destructive/10" : ""}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            Health Indicators
          </CardTitle>
        </CardHeader>
        <CardContent>
          {burnout.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
              <CheckCircle2 className="w-4 h-4" /> Healthy pacing detected.
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              {burnout.map((b: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{b.message}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
