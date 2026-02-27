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
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { FiMoreVertical, FiEdit, FiTrendingUp, FiArchive, FiUser, FiCheckCircle, FiEye, FiTrash2, FiRefreshCw, FiAlertTriangle, FiGlobe, FiFacebook } from "react-icons/fi";
import { LeadStatus } from "@prisma/client";
import LeadConversionDialog from "./LeadConversionDialog";
import { updateLeadStatus, assignLeadOwner, bulkMoveToTrash, bulkRestore, bulkDeletePermanently } from "@/app/actions/crm/lead.action";
import { toast } from "sonner";
import Link from "next/link";

interface Lead {
  id: string;
  leadNumber: string | null;
  name: string;
  email: string | null;
  phone: string;
  company: string | null;
  website: string | null;
  facebook: string | null;
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
  isTrashView?: boolean;
}

const statusMap: Record<LeadStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" | "success" }> = {
  [LeadStatus.NEW]: { label: "New", variant: "default" },
  [LeadStatus.CONTACTED]: { label: "Contacted", variant: "secondary" },
  [LeadStatus.QUALIFIED]: { label: "Qualified", variant: "success" },
  [LeadStatus.UNQUALIFIED]: { label: "Unqualified", variant: "destructive" },
  [LeadStatus.CONVERTED]: { label: "Converted", variant: "outline" },
};

export default function LeadTable({ leads, owners = [], onEdit, onRefresh, isTrashView = false }: LeadTableProps) {
  const [conversionLead, setConversionLead] = useState<{ id: string; name: string } | null>(null);
  const [assignOwnerLead, setAssignOwnerLead] = useState<{ id: string; name: string; currentOwnerId?: string | null } | null>(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");
  
  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);

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

  // Bulk Actions
  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkMoveToTrash = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkActionLoading(true);
    try {
      const result = await bulkMoveToTrash(Array.from(selectedIds));
      if (result.success) {
        toast.success(`Moved ${result.count} leads to trash`);
        setSelectedIds(new Set());
        onRefresh();
      } else {
        toast.error(result.error || "Failed to move to trash");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
        setIsBulkActionLoading(false);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkActionLoading(true);
    try {
      const result = await bulkRestore(Array.from(selectedIds));
      if (result.success) {
        toast.success(`Restored ${result.count} leads`);
        setSelectedIds(new Set());
        onRefresh();
      } else {
        toast.error(result.error || "Failed to restore leads");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
        setIsBulkActionLoading(false);
    }
  };

  const handleBulkDeletePermanently = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkActionLoading(true);
    try {
      const result = await bulkDeletePermanently(Array.from(selectedIds));
      if (result.success) {
        toast.success(`Permanently deleted ${result.count} leads`);
        setSelectedIds(new Set());
        setDeleteConfirmationOpen(false);
        onRefresh();
      } else {
        toast.error(result.error || "Failed to delete leads");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
        setIsBulkActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-primary/5 border border-primary/10 p-2 rounded-md flex items-center justify-between animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2 px-2">
            <span className="font-semibold text-primary">{selectedIds.size}</span>
            <span className="text-muted-foreground text-sm">selected</span>
          </div>
          <div className="flex items-center gap-2">
            {!isTrashView ? (
               <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleBulkMoveToTrash}
                disabled={isBulkActionLoading}
               >
                 <FiTrash2 className="mr-2 h-4 w-4" />
                 Move to Trash
               </Button>
            ) : (
                <>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleBulkRestore}
                        disabled={isBulkActionLoading}
                    >
                        <FiRefreshCw className="mr-2 h-4 w-4" />
                        Restore
                    </Button>
                    <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => setDeleteConfirmationOpen(true)}
                        disabled={isBulkActionLoading}
                    >
                        <FiAlertTriangle className="mr-2 h-4 w-4" />
                        Delete Permanently
                    </Button>
                </>
            )}
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox 
                  checked={selectedIds.size === leads.length && leads.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[120px]">Lead #</TableHead>
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
                <TableCell colSpan={9} className="h-24 text-center">
                  {isTrashView ? "Trash is empty." : "No leads found."}
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id} data-state={selectedIds.has(lead.id) && "selected"}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedIds.has(lead.id)}
                      onCheckedChange={() => toggleSelect(lead.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {lead.leadNumber || "-"}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/crm/leads/${lead.id}`} className="hover:underline text-primary">
                      {lead.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm text-muted-foreground">
                      {lead.email && <span>{lead.email}</span>}
                      <span>{lead.phone}</span>
                      <div className="flex gap-2 mt-1">
                          {lead.website && (
                              <a href={lead.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors" title="Website">
                                  <FiGlobe className="h-3.5 w-3.5" />
                              </a>
                          )}
                          {lead.facebook && (
                              <a href={lead.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors" title="Facebook">
                                  <FiFacebook className="h-3.5 w-3.5" />
                              </a>
                          )}
                      </div>
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
                        {!isTrashView ? (
                            <>
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
                                <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => {
                                        // Single item move to trash logic (reusing bulk for simplicity or add single)
                                        // For now using the bulk selection logic
                                        setSelectedIds(new Set([lead.id]));
                                        // Ideally trigger confirm or immediate action. 
                                        // Let's rely on checkbox + bulk action for now or implement single action
                                        bulkMoveToTrash([lead.id]).then(() => onRefresh());
                                    }}
                                >
                                <FiTrash2 className="mr-2 h-4 w-4" />
                                Move to Trash
                                </DropdownMenuItem>
                            </>
                        ) : (
                            <>
                                <DropdownMenuItem onClick={() => bulkRestore([lead.id]).then(() => onRefresh())}>
                                    <FiRefreshCw className="mr-2 h-4 w-4" />
                                    Restore
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => {
                                         setSelectedIds(new Set([lead.id]));
                                         setDeleteConfirmationOpen(true);
                                    }}
                                >
                                    <FiAlertTriangle className="mr-2 h-4 w-4" />
                                    Delete Permanently
                                </DropdownMenuItem>
                            </>
                        )}
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

          <Dialog open={deleteConfirmationOpen} onOpenChange={setDeleteConfirmationOpen}>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>Permanently Delete Leads?</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                      <p className="text-muted-foreground">
                          Are you sure you want to permanently delete {selectedIds.size} selected leads? 
                          This action cannot be undone. Leads that have been converted to opportunities cannot be deleted.
                      </p>
                  </div>
                  <DialogFooter>
                      <Button variant="outline" onClick={() => setDeleteConfirmationOpen(false)} disabled={isBulkActionLoading}>Cancel</Button>
                      <Button variant="destructive" onClick={handleBulkDeletePermanently} disabled={isBulkActionLoading}>
                          {isBulkActionLoading ? "Deleting..." : "Delete Permanently"}
                      </Button>
                  </DialogFooter>
              </DialogContent>
          </Dialog>
      </div>
    </div>
  );
}
