"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { FiDollarSign, FiCalendar, FiUser, FiBriefcase } from "react-icons/fi";
import { OpportunityStage } from "@prisma/client";
import Link from "next/link";

interface Opportunity {
  id: string;
  opportunityNumber?: string | null;
  title: string;
  value: number | null;
  stage: OpportunityStage;
  expectedCloseDate: Date | null;
  client: { name: string; company: string | null };
  contact: { name: string } | null;
  owner: { name: string | null; image: string | null } | null;
}

interface OpportunityGridProps {
  opportunities: Opportunity[];
  onEdit: (opp: Opportunity) => void;
}

const stageMap: Record<OpportunityStage, { label: string; variant: "default" | "secondary" | "outline" | "destructive" | "success" }> = {
  [OpportunityStage.DISCOVERY]: { label: "Discovery", variant: "default" },
  [OpportunityStage.QUALIFIED]: { label: "Qualified", variant: "secondary" },
  [OpportunityStage.SOLUTION]: { label: "Solution", variant: "outline" },
  [OpportunityStage.PROPOSAL]: { label: "Proposal", variant: "secondary" },
  [OpportunityStage.NEGOTIATION]: { label: "Negotiation", variant: "outline" },
  [OpportunityStage.WON]: { label: "Won", variant: "success" },
  [OpportunityStage.LOST]: { label: "Lost", variant: "destructive" },
};

export default function OpportunityGrid({ opportunities, onEdit }: OpportunityGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {opportunities.map((opp) => (
        <Card 
          key={opp.id} 
          className="hover:shadow-md transition-shadow cursor-pointer group"
          onClick={() => onEdit(opp)}
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                  <Link href={`/dashboard/crm/opportunities/${opp.id}`} className="hover:underline">
                    {opp.title}
                  </Link>
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FiBriefcase className="h-3 w-3" />
                  <span className="truncate max-w-[150px]">{opp.client.company || opp.client.name}</span>
                </div>
              </div>
              <Badge variant={stageMap[opp.stage].variant as any}>
                {stageMap[opp.stage].label}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Value</p>
                <div className="flex items-center gap-1.5 font-medium">
                  <FiDollarSign className="h-3.5 w-3.5 text-green-600" />
                  <span>{opp.value ? opp.value.toLocaleString() : "0"}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Exp. Close</p>
                <div className="flex items-center gap-1.5 font-medium">
                  <FiCalendar className="h-3.5 w-3.5 text-slate-500" />
                  <span>{opp.expectedCloseDate ? format(new Date(opp.expectedCloseDate), "MMM d, yyyy") : "-"}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center border text-[10px] font-bold text-slate-600">
                    {opp.owner?.name?.[0] || <FiUser className="h-3 w-3" />}
                 </div>
                 <span className="text-xs font-medium truncate max-w-[100px]">{opp.owner?.name || "Unassigned"}</span>
              </div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter bg-slate-100 px-1.5 py-0.5 rounded">
                {opp.opportunityNumber || "OPP-NEW"}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
