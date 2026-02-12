"use client";

import React from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FiMail, 
  FiPhone, 
  FiBriefcase, 
  FiCalendar, 
  FiUser, 
  FiMoreVertical,
  FiEye,
  FiEdit,
  FiTrendingUp
} from "react-icons/fi";
import { LeadStatus } from "@prisma/client";
import { format } from "date-fns";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Lead {
  id: string;
  leadNumber: string | null;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  status: LeadStatus;
  ownerId: string | null;
  owner?: { id: string; name: string; image: string | null } | null;
  createdAt: Date;
}

interface LeadGridProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onConvert?: (lead: Lead) => void;
}

const statusMap: Record<LeadStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" | "success" }> = {
  [LeadStatus.NEW]: { label: "New", variant: "default" },
  [LeadStatus.CONTACTED]: { label: "Contacted", variant: "secondary" },
  [LeadStatus.QUALIFIED]: { label: "Qualified", variant: "success" },
  [LeadStatus.UNQUALIFIED]: { label: "Unqualified", variant: "destructive" },
  [LeadStatus.CONVERTED]: { label: "Converted", variant: "outline" },
};

export default function LeadGrid({ leads, onEdit, onConvert }: LeadGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {leads.map((lead) => (
        <Card key={lead.id} className="group hover:border-primary/50 transition-all shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <Link 
                  href={`/dashboard/crm/leads/${lead.id}`} 
                  className="font-bold text-lg hover:underline decoration-primary underline-offset-4"
                >
                  {lead.name}
                </Link>
                <div className="text-[10px] font-mono text-muted-foreground">
                    {lead.leadNumber}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <FiBriefcase className="mr-1 h-3 w-3" />
                  {lead.company || "No Company"}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <FiMoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/crm/leads/${lead.id}`} className="flex items-center">
                      <FiEye className="mr-2 h-4 w-4" /> View
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(lead)}>
                    <FiEdit className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  {lead.status !== LeadStatus.CONVERTED && onConvert && (
                    <DropdownMenuItem 
                      className="text-primary font-medium" 
                      onClick={() => onConvert(lead)}
                    >
                      <FiTrendingUp className="mr-2 h-4 w-4" /> Convert
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center text-sm">
                <FiMail className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{lead.email}</span>
              </div>
              {lead.phone && (
                <div className="flex items-center text-sm">
                  <FiPhone className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <span>{lead.phone}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <Badge variant={statusMap[lead.status].variant as any}>
                {statusMap[lead.status].label}
              </Badge>
              <div className="flex items-center text-xs text-muted-foreground">
                <FiCalendar className="mr-1 h-3 w-3" />
                {format(new Date(lead.createdAt), "MMM d, yyyy")}
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-4 pt-0 border-t bg-muted/5 flex items-center justify-between">
            <div className="flex items-center text-xs text-muted-foreground py-2">
              <FiUser className="mr-1.5 h-3.5 w-3.5" />
              <span>Assigned to: <span className="font-medium text-foreground">{lead.owner?.name || "Unassigned"}</span></span>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
