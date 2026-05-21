"use client";

import { useState } from "react";
import { getAIRiskAssessment } from "@/app/actions/projects/ai.action";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, BrainCircuit, AlertOctagon, CheckCircle2 } from "lucide-react";

export function AIAdvisorPanel({ projectId }: { projectId: string }) {
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerAnalysis = async () => {
    setLoading(true);
    setError(null);
    const res = await getAIRiskAssessment(projectId);
    if (res.success) {
      setAssessment(res.data);
    } else {
      setError(res.error || "AI Engine failed to generate analysis");
    }
    setLoading(false);
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-bold flex items-center gap-2 text-primary">
          <BrainCircuit className="w-5 h-5" />
          Project Intelligence Advisor
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={triggerAnalysis} 
          disabled={loading}
          className="bg-white"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {assessment ? "Refresh Analysis" : "Run AI Analysis"}
        </Button>
      </CardHeader>
      <CardContent>
        {error && <div className="text-sm text-destructive mt-2">{error}</div>}

        {!assessment && !loading && !error && (
          <div className="text-sm text-muted-foreground mt-2">
            Click "Run AI Analysis" to calculate delivery risk based on real-time financials and team workload.
          </div>
        )}

        {assessment && (
          <div className="space-y-6 mt-4">
            
            {/* Risk Badges */}
            <div className="flex items-center gap-4">
              <Badge variant={assessment.overallRiskLevel === "CRITICAL" ? "destructive" : assessment.overallRiskLevel === "HIGH" ? "destructive" : assessment.overallRiskLevel === "MEDIUM" ? "secondary" : "default"} className="px-3 py-1">
                Risk Level: {assessment.overallRiskLevel}
              </Badge>
              <div className="text-sm font-medium flex items-center gap-1">
                {assessment.delayProbabilityPercentage > 50 ? <AlertOctagon className="w-4 h-4 text-destructive" /> : <CheckCircle2 className="w-4 h-4 text-green-600" />}
                {assessment.delayProbabilityPercentage}% Probability of Delay
              </div>
            </div>

            {/* Analysis Text Blocks */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-1">Financial Health Analysis</h4>
                <p className="text-sm text-muted-foreground leading-relaxed bg-white p-3 rounded-md border">
                  {assessment.financialHealthAnalysis}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold mb-1">Workload & Bottlenecks</h4>
                <p className="text-sm text-muted-foreground leading-relaxed bg-white p-3 rounded-md border">
                  {assessment.workloadBottleneckAnalysis}
                </p>
              </div>
            </div>

            {/* Actionable Recommendations */}
            <div>
              <h4 className="text-sm font-semibold mb-2">AI Recommended Actions</h4>
              <ul className="space-y-2">
                {assessment.recommendedActions.map((action: string, idx: number) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                      {idx + 1}
                    </div>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  );
}
