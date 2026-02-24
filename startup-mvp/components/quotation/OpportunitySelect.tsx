"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getOpportunities } from "@/app/actions/crm/opportunity.action";
import { Target } from "lucide-react";

interface OpportunitySelectProps {
  value?: string;
  onValueChange: (value: any) => void;
  disabled?: boolean;
}

export default function OpportunitySelect({ value, onValueChange, disabled }: OpportunitySelectProps) {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOpps = async () => {
      setLoading(true);
      const result = await getOpportunities();
      if (result.success) {
        setOpportunities(result.opportunities || []);
      }
      setLoading(false);
    };
    fetchOpps();
  }, []);

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
        <Target className="h-4 w-4" />
        Linked Opportunity
      </Label>
      <Select 
        value={value} 
        onValueChange={(val) => {
          if (val === "none") {
            onValueChange(null);
          } else {
            const opp = opportunities.find(o => o.id === val);
            onValueChange(opp || val);
          }
        }} 
        disabled={disabled || loading}
      >
        <SelectTrigger className="h-9 w-full text-sm">
          <SelectValue placeholder={loading ? "Loading..." : "Select an opportunity"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {opportunities.map((opp) => (
            <SelectItem key={opp.id} value={opp.id}>
              {opp.title} ({opp.client.company || opp.client.name})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
