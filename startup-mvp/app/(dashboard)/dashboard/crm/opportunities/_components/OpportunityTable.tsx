"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { OpportunityStage } from "@prisma/client";
import Link from "next/link";
import { FiMoreVertical, FiEdit, FiFileText, FiEye } from "react-icons/fi";

interface Opportunity {
  id: string;
  opportunityNumber?: string | null;
  title: string;
  value: any; // Prisma Decimal
  stage: OpportunityStage;
  expectedCloseDate: Date | null;
  client: { name: string; company: string | null };
  contact: { firstName: string; lastName: string } | null;
  createdAt: Date;
  lead?: { id: string; leadNumber: string | null; name: string } | null;
}

interface OpportunityTableProps {
  opportunities: Opportunity[];
  onEdit: (opp: Opportunity) => void;
  onRefresh: () => void;
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

export default function OpportunityTable({ opportunities, onEdit, onRefresh }: OpportunityTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Opportunity</TableHead>
            <TableHead>Account / Contact</TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Exp. Close</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {opportunities.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No opportunities found.
              </TableCell>
            </TableRow>
          ) : (
            opportunities.map((opp) => (
              <TableRow key={opp.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <Link href={`/dashboard/crm/opportunities/${opp.id}`} className="font-medium hover:underline text-primary">
                      {opp.title}
                    </Link>
                    {opp.opportunityNumber && (
                      <span className="text-xs text-muted-foreground">{opp.opportunityNumber}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col text-sm">
                    <span className="font-medium">{opp.client.company || opp.client.name}</span>
                    <span className="text-muted-foreground">
                      {opp.contact ? `${opp.contact.firstName} ${opp.contact.lastName}` : "No contact"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {opp.lead ? (
                    <Link
                      href={`/dashboard/crm/leads/${opp.lead.id}`}
                      className="font-medium hover:underline text-primary font-mono text-xs"
                    >
                      {opp.lead.leadNumber || opp.lead.name || "View Lead"}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground text-xs italic">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {opp.value ? `$${Number(opp.value ?? 0).toLocaleString() ?? "0"}` : "-"}
                </TableCell>
                <TableCell>
                  <Badge variant={stageMap[opp.stage].variant as any}>
                    {stageMap[opp.stage].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {opp.expectedCloseDate ? format(new Date(opp.expectedCloseDate), "MMM d, yyyy") : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <FiMoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/crm/opportunities/${opp.id}`} className="flex items-center w-full cursor-pointer">
                          <FiEye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(opp)}>
                        <FiEdit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {}}>
                        <FiFileText className="mr-2 h-4 w-4" />
                        Create Quotation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
