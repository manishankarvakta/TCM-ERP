"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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

  const [search, setSearch] = useState("");

  const filteredOpportunities = opportunities.filter((opp) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      opp.title?.toLowerCase().includes(q) ||
      opp.client?.company?.toLowerCase().includes(q) ||
      opp.client?.name?.toLowerCase().includes(q) ||
      opp.contact?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
        <Target className="h-4 w-4" />
        Linked Opportunity
      </Label>
      <Select
        value={value || "none"}
        onValueChange={(val) => {
          if (!val || val === "none") {
            onValueChange(null);
          } else {
            const opp = opportunities.find((o) => o.id === val);
            onValueChange(opp || val);
          }
        }}
        disabled={disabled || loading}
      >
        <SelectTrigger className="h-9 w-full text-sm text-left justify-start gap-2">
          <SelectValue placeholder={loading ? "Loading..." : "Select an opportunity"} />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          <div className="sticky top-0 z-50 bg-popover p-2 border-b">
            <Input
              placeholder="Search opportunities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <SelectItem value="none" className="text-left text-xs">
            None
          </SelectItem>
          {filteredOpportunities.length === 0 ? (
            <div className="p-2 text-xs text-gray-500 text-left">No opportunities found</div>
          ) : (
            filteredOpportunities.map((opp) => (
              <SelectItem key={opp.id} value={opp.id} className="text-left cursor-pointer">
                <div className="flex flex-col text-left items-start">
                  <span className="font-medium text-sm text-left">{opp.title}</span>
                  {(opp.client?.company || opp.client?.name || opp.contact?.name) && (
                    <span className="text-xs text-muted-foreground truncate max-w-[300px] mt-0.5 text-left">
                      {[opp.client?.company || opp.client?.name, opp.contact?.name]
                        .filter(Boolean)
                        .join(" - ")}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
