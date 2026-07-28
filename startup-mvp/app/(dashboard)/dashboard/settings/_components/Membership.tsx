"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  FiPlus,
  FiSearch,
  FiEdit,
  FiTrash2,
  FiRotateCw,
  FiMoreVertical,
  FiAward,
  FiPercent,
  FiX,
  FiCheckCircle,
} from "react-icons/fi";
import {
  getMembershipTiers,
  createMembershipTier,
  updateMembershipTier,
  trashMembershipTier,
  deleteMembershipTier,
  bulkUpdateMembershipTierStatus,
} from "../_actions/membership-tier.action";

const tierFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").toUpperCase(),
  minPurchaseValue: z.coerce.number().min(0, "Minimum purchase cannot be negative"),
  discountPercentage: z.coerce.number().min(0, "Discount cannot be negative").max(100, "Discount cannot exceed 100%"),
  status: z.string().default("active"),
});

type TierFormData = z.infer<typeof tierFormSchema>;

interface MembershipTier {
  id: string;
  name: string;
  minPurchaseValue: any; // Prisma Decimal
  discountPercentage: any; // Prisma Decimal
  status: string;
  isTrash: boolean;
}

export default function Membership() {
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "trash">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<MembershipTier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<TierFormData>({
    resolver: zodResolver(tierFormSchema) as any,
    defaultValues: {
      name: "",
      minPurchaseValue: 0,
      discountPercentage: 0,
      status: "active",
    },
  });

  const loadTiers = async () => {
    try {
      setLoading(true);
      const result = await getMembershipTiers(
        1,
        100,
        searchQuery,
        activeTab === "trash" ? "trash" : "all"
      );
      if (result.success) {
        setTiers(result.membershipTiers as any[]);
        setSelectedIds(new Set());
      } else {
        toast({ title: "Error", description: result.error || "Failed to load tiers", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Unexpected error loading tiers", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTiers();
  }, [activeTab, searchQuery]);

  const handleSelect = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(tiers.map(t => t.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBulkAction = async (action: "trash" | "active" | "inactive" | "restore" | "delete") => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    startTransition(async () => {
      const result = await bulkUpdateMembershipTierStatus(ids, action);
      if (result.success) {
        toast({ title: "Success", description: `Bulk action "${action}" completed successfully` });
        setSelectedIds(new Set());
        loadTiers();
      } else {
        toast({ title: "Error", description: result.error || "Failed to complete bulk action", variant: "destructive" });
      }
    });
  };

  const handleOpenCreate = () => {
    setEditingTier(null);
    form.reset({
      name: "",
      minPurchaseValue: 0,
      discountPercentage: 0,
      status: "active",
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (tier: MembershipTier) => {
    setEditingTier(tier);
    form.reset({
      name: tier.name,
      minPurchaseValue: Number(tier.minPurchaseValue || 0),
      discountPercentage: Number(tier.discountPercentage),
      status: tier.status,
    });
    setIsFormOpen(true);
  };

  const onSubmit = async (data: TierFormData) => {
    startTransition(async () => {
      let result;
      if (editingTier) {
        result = await updateMembershipTier(editingTier.id, data);
      } else {
        result = await createMembershipTier(data);
      }

      if (result.success) {
        toast({
          title: "Success",
          description: editingTier
            ? "Membership tier updated successfully"
            : "Membership tier created successfully",
        });
        setIsFormOpen(false);
        loadTiers();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save membership tier",
          variant: "destructive",
        });
      }
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await trashMembershipTier(deleteId);
      if (result.success) {
        toast({ title: "Success", description: "Membership tier moved to trash" });
        setDeleteId(null);
        loadTiers();
      } else {
        toast({ title: "Error", description: result.error || "Failed to delete tier", variant: "destructive" });
      }
    });
  };

  const handlePermanentDelete = async () => {
    if (!permanentDeleteId) return;
    startTransition(async () => {
      const result = await deleteMembershipTier(permanentDeleteId);
      if (result.success) {
        toast({ title: "Success", description: "Membership tier permanently deleted" });
        setPermanentDeleteId(null);
        loadTiers();
      } else {
        toast({ title: "Error", description: result.error || "Failed to permanently delete tier", variant: "destructive" });
      }
    });
  };

  const handleRestore = async (id: string) => {
    startTransition(async () => {
      const result = await bulkUpdateMembershipTierStatus([id], "restore");
      if (result.success) {
        toast({ title: "Success", description: "Membership tier restored successfully" });
        loadTiers();
      } else {
        toast({ title: "Error", description: result.error || "Failed to restore tier", variant: "destructive" });
      }
    });
  };

  const handleToggleStatus = async (tier: MembershipTier) => {
    const nextStatus = tier.status === "active" ? "inactive" : "active";
    startTransition(async () => {
      const result = await updateMembershipTier(tier.id, { status: nextStatus });
      if (result.success) {
        toast({ title: "Success", description: `Status updated to ${nextStatus}` });
        loadTiers();
      } else {
        toast({ title: "Error", description: result.error || "Failed to update status", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Membership Tiers</h1>
          <p className="text-sm text-muted-foreground">
            Configure dynamic rules and automated checkout discounts for loyalty members.
          </p>
        </div>
        {activeTab !== "trash" && (
          <Button onClick={handleOpenCreate} className="gap-2">
            <FiPlus className="h-4 w-4" />
            Add Membership Tier
          </Button>
        )}
      </div>

      {/* Tabs and Search Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("all")}
            className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "all"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            All Tiers
          </button>
          <button
            onClick={() => setActiveTab("trash")}
            className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "trash"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Trash
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-end w-full sm:w-auto">
          {selectedIds.size > 0 && (
            <span className="text-xs text-muted-foreground whitespace-nowrap mr-1">
              {selectedIds.size} selected
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={actionPending || selectedIds.size === 0} className="h-9">
                <FiMoreVertical className="mr-2 h-4 w-4" />
                Bulk Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {activeTab !== "trash" ? (
                <>
                  <DropdownMenuItem onClick={() => handleBulkAction("trash")}>
                    <FiTrash2 className="mr-2 h-4 w-4 text-destructive" />
                    Move to Trash
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction("active")}>
                    <FiCheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                    Activate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction("inactive")}>
                    <FiX className="mr-2 h-4 w-4 text-muted-foreground" />
                    Deactivate
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => handleBulkAction("restore")}>
                    <FiRotateCw className="mr-2 h-4 w-4 text-emerald-500" />
                    Restore Tiers
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction("delete")}>
                    <FiTrash2 className="mr-2 h-4 w-4 text-destructive" />
                    Delete Permanently
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="relative w-full sm:max-w-xs">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tiers by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-sm h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <FiX className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground">Loading membership tiers...</div>
          ) : tiers.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              {searchQuery ? "No tiers matching your search query." : "No membership tiers configured."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={tiers.length > 0 && selectedIds.size === tiers.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Tier Name</TableHead>
                  <TableHead>Min Purchase</TableHead>
                  <TableHead>Auto Discount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.map((tier) => {
                  const isSelected = selectedIds.has(tier.id);
                  return (
                    <TableRow key={tier.id} className={isSelected ? "bg-muted/50" : undefined}>
                      <TableCell className="w-12">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelect(tier.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-semibold text-primary">{tier.name}</TableCell>
                    <TableCell>৳{Number(tier.minPurchaseValue || 0).toLocaleString()} BDT</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1 border-primary/20 text-primary bg-primary/5">
                        <FiPercent className="h-3 w-3" />
                        {Number(tier.discountPercentage).toFixed(1)}% Discount
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {tier.isTrash ? (
                        <Badge variant="destructive">Trashed</Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={tier.status === "active"}
                            onCheckedChange={() => handleToggleStatus(tier)}
                            disabled={actionPending}
                          />
                          <span className="text-xs text-muted-foreground capitalize">{tier.status}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!tier.isTrash ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(tier)}
                            disabled={actionPending}
                          >
                            <FiEdit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(tier.id)}
                            className="text-destructive hover:bg-destructive/10"
                            disabled={actionPending}
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRestore(tier.id)}
                            className="text-emerald-500 hover:bg-emerald-500/10"
                            disabled={actionPending}
                            title="Restore"
                          >
                            <FiRotateCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPermanentDeleteId(tier.id)}
                            className="text-destructive hover:bg-destructive/10"
                            disabled={actionPending}
                            title="Delete Permanently"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editingTier ? "Edit Membership Tier" : "Add Membership Tier"}</DialogTitle>
              <DialogDescription>
                Set the points threshold and checkout discount. Changes will apply immediately.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tier Name (in CAPS)</Label>
                <Controller
                  name="name"
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      id="name"
                      placeholder="e.g. BRONZE"
                      className="uppercase"
                      disabled={actionPending}
                      {...field}
                    />
                  )}
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>



              <div className="space-y-2">
                <Label htmlFor="minPurchaseValue">Minimum Purchase Amount (BDT)</Label>
                <Controller
                  name="minPurchaseValue"
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      id="minPurchaseValue"
                      type="number"
                      placeholder="e.g. 2000"
                      disabled={actionPending}
                      {...field}
                    />
                  )}
                />
                {form.formState.errors.minPurchaseValue && (
                  <p className="text-xs text-destructive">{form.formState.errors.minPurchaseValue.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountPercentage">Checkout Discount Percentage (%)</Label>
                <div className="relative">
                  <Controller
                    name="discountPercentage"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        id="discountPercentage"
                        type="number"
                        step="0.1"
                        placeholder="e.g. 5.0"
                        disabled={actionPending}
                        {...field}
                      />
                    )}
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground text-sm">
                    %
                  </div>
                </div>
                {form.formState.errors.discountPercentage && (
                  <p className="text-xs text-destructive">{form.formState.errors.discountPercentage.message}</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={actionPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={actionPending}>
                {actionPending ? "Saving..." : "Save Tier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the membership tier to trash. Customers under this point threshold will no longer get the tier benefits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation Alert */}
      <AlertDialog open={!!permanentDeleteId} onOpenChange={() => setPermanentDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the membership tier and disconnect it from all assigned clients.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              disabled={actionPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
