"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FiSearch,
  FiPlus,
  FiBox,
  FiDollarSign,
  FiUser,
  FiMapPin,
  FiRepeat,
  FiTrash2,
  FiCheckCircle,
  FiAlertCircle,
  FiTag,
  FiTool,
  FiRotateCcw,
} from "react-icons/fi";
import { formatCurrency } from "@/lib/utils/formatters";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import {
  createFixedAssetItem,
  updateFixedAssetItemStatus,
  transferFixedAssetItem,
} from "../_actions/fixed-asset-item.action";
import { SearchableAccountSelect } from "./searchable-account-select";

interface COAOption {
  id: string;
  code: string;
  name: string;
}

interface EmployeeOption {
  id: string;
  name: string;
  employeeCode?: string | null;
  designation?: string | null;
}

interface ItemizedAssetsViewProps {
  items: any[];
  metrics: any;
  assetAccounts: COAOption[];
  employees: EmployeeOption[];
}

export default function ItemizedAssetsView({
  items = [],
  metrics = { totalCost: 0, totalAccumDepr: 0, totalNBV: 0, countsByStatus: {} },
  assetAccounts = [],
  employees = [],
}: ItemizedAssetsViewProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedItemForTransfer, setSelectedItemForTransfer] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Registration Form State
  const defaultAccount =
    assetAccounts.find((a) => a.code.startsWith("172") || a.code.startsWith("174") || a.code.startsWith("171")) ||
    assetAccounts[0];

  const [name, setName] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [chartOfAccountId, setChartOfAccountId] = useState(defaultAccount?.id || "");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [salvageValue, setSalvageValue] = useState("0");
  const [usefulLifeYears, setUsefulLifeYears] = useState("5");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [location, setLocation] = useState("Main Office");
  const [assignedToEmployeeId, setAssignedToEmployeeId] = useState("");
  const [notes, setNotes] = useState("");

  // Transfer Form State
  const [newLocation, setNewLocation] = useState("");
  const [newEmployeeId, setNewEmployeeId] = useState("");

  const handleRegisterItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(purchaseCost);

    if (!name || !chartOfAccountId || isNaN(cost) || cost <= 0) {
      toast({
        title: "Validation Error",
        description: "Item Name, Asset Account, and Positive Purchase Cost are required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createFixedAssetItem({
        name,
        assetTag: assetTag || undefined,
        serialNumber: serialNumber || undefined,
        chartOfAccountId,
        purchaseCost: cost,
        salvageValue: parseFloat(salvageValue) || 0,
        usefulLifeYears: parseInt(usefulLifeYears, 10) || 5,
        purchaseDate,
        location: location || "Main Office",
        assignedToEmployeeId: assignedToEmployeeId || undefined,
        notes: notes || undefined,
      });

      if (res.success) {
        toast({
          title: "Asset Item Registered",
          description: `Registered '${name}' (Tag: ${res.item.assetTag}) successfully`,
        });
        setIsAddModalOpen(false);
        setName("");
        setAssetTag("");
        setSerialNumber("");
        setPurchaseCost("");
        setNotes("");
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: res.error || "Failed to register item",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (
    id: string,
    status: "in_use" | "pending_transfer" | "ready_for_disposal" | "disposed" | "in_maintenance"
  ) => {
    try {
      const res = await updateFixedAssetItemStatus(id, status);
      if (res.success) {
        toast({
          title: "Status Updated",
          description: `Item status updated to ${status.replace("_", " ").toUpperCase()}`,
        });
        router.refresh();
      } else {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleOpenTransferModal = (item: any) => {
    setSelectedItemForTransfer(item);
    setNewLocation(item.location || "Main Office");
    setNewEmployeeId(item.assignedToEmployeeId || "");
    setIsTransferModalOpen(true);
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForTransfer) return;

    setIsSubmitting(true);
    try {
      const res = await transferFixedAssetItem(selectedItemForTransfer.id, {
        location: newLocation,
        assignedToEmployeeId: newEmployeeId || undefined,
      });

      if (res.success) {
        toast({
          title: "Transfer Recorded",
          description: `Asset ${selectedItemForTransfer.assetTag} transferred to ${newLocation}`,
        });
        setIsTransferModalOpen(false);
        setSelectedItemForTransfer(null);
        router.refresh();
      } else {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(term) ||
      item.assetTag.toLowerCase().includes(term) ||
      (item.serialNumber && item.serialNumber.toLowerCase().includes(term)) ||
      (item.location && item.location.toLowerCase().includes(term)) ||
      (item.Employee && item.Employee.name.toLowerCase().includes(term))
    );
  });

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "in_use":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
            In Use
          </Badge>
        );
      case "pending_transfer":
        return (
          <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200 text-[10px]">
            Pending Transfer
          </Badge>
        );
      case "ready_for_disposal":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
            Ready for Disposal
          </Badge>
        );
      case "disposed":
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
            Disposed / Retired
          </Badge>
        );
      case "in_maintenance":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">
            In Maintenance
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-l-4 border-l-blue-600 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Physical Units
            </CardTitle>
            <FiTag className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-primary">
              {metrics?.countsByStatus?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Itemized Fixed Assets</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-emerald-500 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active / In Use
            </CardTitle>
            <FiCheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {metrics?.countsByStatus?.in_use || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Assigned & Active Equipment</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-amber-500 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Ready For Disposal
            </CardTitle>
            <FiAlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {metrics?.countsByStatus?.ready_for_disposal || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Flagged for Retirement</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-purple-500 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Net Book Value ($NBV$)
            </CardTitle>
            <FiDollarSign className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
              {formatCurrency(metrics?.totalNBV || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Itemized Carrying Value</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search Tag, Serial #, Item, Location, Custodian..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="in_use">In Use</SelectItem>
              <SelectItem value="pending_transfer">Pending Transfer</SelectItem>
              <SelectItem value="ready_for_disposal">Ready for Disposal</SelectItem>
              <SelectItem value="disposed">Disposed / Retired</SelectItem>
              <SelectItem value="in_maintenance">In Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
          <FiPlus className="h-4 w-4" /> Register Asset Unit
        </Button>
      </div>

      {/* Item Table */}
      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Asset Tag / Serial</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>GL Account</TableHead>
              <TableHead>Location & Custodian</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Accum. Depr.</TableHead>
              <TableHead className="text-right">NBV Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  <FiBox className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                  <p className="font-medium">No itemized fixed assets found matching criteria</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click &apos;Register Asset Unit&apos; to add physical equipment records.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-mono text-xs">
                    <div className="font-bold text-primary">{item.assetTag}</div>
                    {item.serialNumber && (
                      <div className="text-[11px] text-muted-foreground font-mono">
                        SN: {item.serialNumber}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {item.name}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {item.ChartOfAccount?.code} - {item.ChartOfAccount?.name}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-1 font-medium text-foreground">
                      <FiMapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span>{item.location || "N/A"}</span>
                    </div>
                    {item.Employee && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        <FiUser className="h-3 w-3 shrink-0" />
                        <span>{item.Employee.name}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatCurrency(item.purchaseCost)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-amber-600">
                    {formatCurrency(item.calculatedAccumDepr)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-xs text-primary">
                    {formatCurrency(item.netBookValue)}
                  </TableCell>
                  <TableCell>{renderStatusBadge(item.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => handleOpenTransferModal(item)}
                      >
                        <FiRepeat className="mr-1 h-3 w-3" /> Transfer
                      </Button>

                      {item.status === "ready_for_disposal" ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                            onClick={() => handleUpdateStatus(item.id, "in_use")}
                            title="Undo Flag / Restore to In Use status"
                          >
                            <FiRotateCcw className="mr-1 h-3 w-3" /> Undo Flag
                          </Button>
                          <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-rose-600">
                            <Link href={`/dashboard/accounts/fixed-assets/disposals?assetId=${item.chartOfAccountId}`}>
                              <FiTrash2 className="mr-1 h-3 w-3" /> Dispose
                            </Link>
                          </Button>
                        </>
                      ) : item.status !== "disposed" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[11px] text-amber-600 hover:text-amber-700"
                          onClick={() => handleUpdateStatus(item.id, "ready_for_disposal")}
                        >
                          <FiAlertCircle className="mr-1 h-3 w-3" /> Flag Disposal
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Retired
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Register Asset Unit Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleRegisterItem}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FiTag className="h-5 w-5 text-blue-600" /> Register Physical Fixed Asset Unit
              </DialogTitle>
              <DialogDescription>
                Register an individual asset unit with tag ID, serial number, physical location, and custodian.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="itemName">Item Name *</Label>
                  <Input
                    id="itemName"
                    placeholder="e.g. MacBook Pro M3 16"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assetTag">Asset Tag ID</Label>
                  <Input
                    id="assetTag"
                    placeholder="Auto-generated if empty (FA-2026-XXXX)"
                    value={assetTag}
                    onChange={(e) => setAssetTag(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="sn">Serial Number / Reg #</Label>
                  <Input
                    id="sn"
                    placeholder="e.g. SN-C02F12345"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Linked General Ledger Account *</Label>
                  <SearchableAccountSelect
                    options={assetAccounts}
                    value={chartOfAccountId}
                    onValueChange={setChartOfAccountId}
                    placeholder="Search account (e.g. 1720)..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="pc">Purchase Cost *</Label>
                  <Input
                    id="pc"
                    type="number"
                    step="0.01"
                    placeholder="150000"
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sv">Salvage Value</Label>
                  <Input
                    id="sv"
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={salvageValue}
                    onChange={(e) => setSalvageValue(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="life">Life (Years)</Label>
                  <Input
                    id="life"
                    type="number"
                    value={usefulLifeYears}
                    onChange={(e) => setUsefulLifeYears(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="pdate">Purchase Date</Label>
                  <Input
                    id="pdate"
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loc">Physical Location</Label>
                  <Input
                    id="loc"
                    placeholder="e.g. Dhanmondi HQ - 4th Floor"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assigned Custodian / Employee</Label>
                <Select value={assignedToEmployeeId} onValueChange={setAssignedToEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned / Select Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} {emp.employeeCode ? `(${emp.employeeCode})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes / Warranty Details</Label>
                <Input
                  id="notes"
                  placeholder="Optional notes or warranty expiration info"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Registering..." : "Register Physical Asset Unit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer Location / Employee Modal */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleExecuteTransfer}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-cyan-600">
                <FiRepeat className="h-5 w-5" /> Transfer Physical Asset Unit
              </DialogTitle>
              <DialogDescription>
                Transfer physical location or custodian employee for {selectedItemForTransfer?.assetTag} - {selectedItemForTransfer?.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newLoc">New Physical Location *</Label>
                <Input
                  id="newLoc"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g. Chittagong Branch Office"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>New Custodian Employee</Label>
                <Select value={newEmployeeId} onValueChange={setNewEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned / Select Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} {emp.employeeCode ? `(${emp.employeeCode})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTransferModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Execute Physical Transfer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
