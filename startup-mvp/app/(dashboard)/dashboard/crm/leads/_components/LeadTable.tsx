"use client";

import { useState } from "react";
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { FiMoreVertical, FiEdit, FiTrendingUp, FiArchive, FiUser, FiCheckCircle, FiEye } from "react-icons/fi";
import { LeadStatus } from "@prisma/client";
import LeadConversionDialog from "./LeadConversionDialog";
import { updateLeadStatus, assignLeadOwner } from "@/app/actions/crm/lead.action";
import { toast } from "sonner";
import Link from "next/link";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  status: LeadStatus;
  ownerId: string | null;
  owner?: { id: string; name: string; image: string | null } | null;
  createdAt: Date;
}

interface LeadTableProps {
  leads: Lead[];
  owners?: { id: string; name: string }[];
  onEdit: (lead: Lead) => void;
  onRefresh: () => void;
}

const statusMap: Record<LeadStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" | "success" }> = {
  [LeadStatus.NEW]: { label: "New", variant: "default" },
  [LeadStatus.CONTACTED]: { label: "Contacted", variant: "secondary" },
  [LeadStatus.QUALIFIED]: { label: "Qualified", variant: "success" },
  [LeadStatus.UNQUALIFIED]: { label: "Unqualified", variant: "destructive" },
  [LeadStatus.CONVERTED]: { label: "Converted", variant: "outline" },
};

export default function LeadTable({ leads, owners = [], onEdit, onRefresh }: LeadTableProps) {
  const [conversionLead, setConversionLead] = useState<{ id: string; name: string } | null>(null);
  const [assignOwnerLead, setAssignOwnerLead] = useState<{ id: string; name: string; currentOwnerId?: string | null } | null>(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");

  const handleStatusUpdate = async (leadId: string, newStatus: LeadStatus) => {
    try {
      const result = await updateLeadStatus(leadId, newStatus);
      if (result.success) {
        toast.success(`Status updated to ${statusMap[newStatus].label}`);
        onRefresh();
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleAssignOwner = async () => {
    if (!assignOwnerLead || !selectedOwnerId) return;
    try {
      const result = await assignLeadOwner(assignOwnerLead.id, selectedOwnerId);
      if (result.success) {
        toast.success("Owner assigned successfully");
        setAssignOwnerLead(null);
        setSelectedOwnerId("");
        onRefresh();
      } else {
        toast.error(result.error || "Failed to assign owner");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact Info</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No leads found.
              </TableCell>
            </TableRow>
          ) : (
            leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">
                  <Link href={`/dashboard/crm/leads/${lead.id}`} className="hover:underline text-primary">
                    {lead.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col text-sm text-muted-foreground">
                    <span>{lead.email}</span>
                    {lead.phone && <span>{lead.phone}</span>}
                  </div>
                </TableCell>
                <TableCell>{lead.company || "-"}</TableCell>
                <TableCell>
                    {lead.owner?.name || <span className="text-muted-foreground italic">Unassigned</span>}
                </TableCell>
                <TableCell>
                  <Badge variant={statusMap[lead.status].variant as any}>
                    {statusMap[lead.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {lead.createdAt ? format(new Date(lead.createdAt), "MMM d, yyyy") : "-"}
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
                        <Link href={`/dashboard/crm/leads/${lead.id}`} className="w-full flex items-center">
                          <FiEye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(lead)}>
                        <FiEdit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <FiCheckCircle className="mr-2 h-4 w-4" />
                            Status
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            <DropdownMenuRadioGroup value={lead.status} onValueChange={(val) => handleStatusUpdate(lead.id, val as LeadStatus)}>
                                {Object.entries(statusMap).map(([status, { label }]) => (
                                    <DropdownMenuRadioItem key={status} value={status} disabled={status === LeadStatus.CONVERTED}>
                                        {label}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      <DropdownMenuItem onClick={() => {
                          setAssignOwnerLead({ id: lead.id, name: lead.name, currentOwnerId: lead.ownerId });
                          setSelectedOwnerId(lead.ownerId || "");
                      }}>
                        <FiUser className="mr-2 h-4 w-4" />
                        Assign Owner
                      </DropdownMenuItem>

                      {lead.status !== LeadStatus.CONVERTED && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                            onClick={() => setConversionLead({ id: lead.id, name: lead.name })}
                            className="text-primary"
                            >
                            <FiTrendingUp className="mr-2 h-4 w-4" />
                            Convert to Deal
                            </DropdownMenuItem>
                        </>
                      )}
                      
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <FiArchive className="mr-2 h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <LeadConversionDialog
        isOpen={!!conversionLead}
        leadId={conversionLead?.id || null}
        leadName={conversionLead?.name || ""}
        onClose={() => setConversionLead(null)}
        onSuccess={onRefresh}
      />

        <Dialog open={!!assignOwnerLead} onOpenChange={(open) => !open && setAssignOwnerLead(null)}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Assign Owner</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="owner">Select New Owner</Label>
                        <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                            <SelectContent>
                                {owners.map((owner) => (
                                    <SelectItem key={owner.id} value={owner.id}>
                                        {owner.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setAssignOwnerLead(null)}>Cancel</Button>
                    <Button onClick={handleAssignOwner}>Assign</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
