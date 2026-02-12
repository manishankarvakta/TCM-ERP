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

interface OpportunitySelectProps {
  value?: string;
  onValueChange: (value: string | null) => void;
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
    <div className="space-y-2">
      <Label>Linked Opportunity</Label>
      <Select value={value} onValueChange={(val) => onValueChange(val === "none" ? null : val)} disabled={disabled || loading}>
        <SelectTrigger>
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
