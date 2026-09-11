"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { upsertEmployeeType, saveEmployeeTypePolicyMatrix } from "../../_actions/payroll-policies.action";
import { FiPlus, FiSave } from "react-icons/fi";

interface PayrollPoliciesClientProps {
  initialEmployeeTypes: any[];
}

export default function PayrollPoliciesClient({ initialEmployeeTypes }: PayrollPoliciesClientProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [employeeTypes, setEmployeeTypes] = useState(initialEmployeeTypes);
  const [selectedTypeId, setSelectedTypeId] = useState<string>(initialEmployeeTypes[0]?.id || "");
  
  // New Employee Type Dialog inputs
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeCode, setNewTypeCode] = useState("");

  const selectedType = employeeTypes.find((t) => t.id === selectedTypeId) || employeeTypes[0];

  // Local Form States
  const [basicRatio, setBasicRatio] = useState<number>(selectedType?.salaryStructurePolicy?.basicRatio ?? 55);
  const [houseRentRatio, setHouseRentRatio] = useState<number>(selectedType?.salaryStructurePolicy?.houseRentRatio ?? 26);
  const [medicalRatio, setMedicalRatio] = useState<number>(selectedType?.salaryStructurePolicy?.medicalRatio ?? 5);
  const [transportRatio, setTransportRatio] = useState<number>(selectedType?.salaryStructurePolicy?.transportRatio ?? 4);
  const [foodRatio, setFoodRatio] = useState<number>(selectedType?.salaryStructurePolicy?.foodRatio ?? 10);

  const [otEligible, setOtEligible] = useState<boolean>(selectedType?.overtimePolicy?.isEligible ?? true);
  const [otMultiplier, setOtMultiplier] = useState<number>(selectedType?.overtimePolicy?.multiplier ?? 1.5);
  const [otMinMinutes, setOtMinMinutes] = useState<number>(selectedType?.overtimePolicy?.minMinutes ?? 30);

  const [tiffinEligible, setTiffinEligible] = useState<boolean>(selectedType?.tiffinBillPolicy?.isEligible ?? true);
  const [tiffinCutoff, setTiffinCutoff] = useState<string>(selectedType?.tiffinBillPolicy?.cutoffTime ?? "20:00");
  const [tiffinAmount, setTiffinAmount] = useState<number>(selectedType?.tiffinBillPolicy?.dailyAmount ?? 50);

  const [nightEligible, setNightEligible] = useState<boolean>(selectedType?.nightBillPolicy?.isEligible ?? true);
  const [nightAmount, setNightAmount] = useState<number>(selectedType?.nightBillPolicy?.dailyAmount ?? 100);

  const handleCreateType = () => {
    if (!newTypeName || !newTypeCode) {
      toast({ title: "Error", description: "Please enter type name and code", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      const res = await upsertEmployeeType({ name: newTypeName, code: newTypeCode });
      if (res.success && res.employeeType) {
        setEmployeeTypes([...employeeTypes, res.employeeType]);
        setSelectedTypeId(res.employeeType.id);
        setNewTypeName("");
        setNewTypeCode("");
        toast({ title: "Success", description: "Employee type created successfully" });
      } else {
        toast({ title: "Error", description: res.error || "Failed to create", variant: "destructive" });
      }
    });
  };

  const handleSavePolicies = () => {
    if (!selectedTypeId) return;

    startTransition(async () => {
      const res = await saveEmployeeTypePolicyMatrix({
        employeeTypeId: selectedTypeId,
        salaryStructure: { basicRatio, houseRentRatio, medicalRatio, transportRatio, foodRatio },
        overtime: { isEligible: otEligible, multiplier: otMultiplier, minMinutes: otMinMinutes },
        tiffinBill: { isEligible: tiffinEligible, cutoffTime: tiffinCutoff, dailyAmount: tiffinAmount },
        nightBill: { isEligible: nightEligible, dailyAmount: nightAmount },
      });

      if (res.success) {
        toast({ title: "Success", description: "Policies saved successfully!" });
      } else {
        toast({ title: "Error", description: res.error || "Failed to save policies", variant: "destructive" });
      }
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Sidebar: Employee Types List */}
      <Card className="md:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Employee Types</CardTitle>
          <CardDescription className="text-xs">Select tier to configure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            {employeeTypes.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTypeId(t.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedTypeId === t.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {t.name} ({t.code})
              </button>
            ))}
          </div>

          <div className="border-t pt-4 space-y-3">
            <Label className="text-xs font-semibold">Add New Employee Type</Label>
            <Input placeholder="Type Name (e.g. Worker)" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} className="h-8 text-xs" />
            <Input placeholder="Code (e.g. WRK)" value={newTypeCode} onChange={(e) => setNewTypeCode(e.target.value)} className="h-8 text-xs" />
            <Button onClick={handleCreateType} disabled={isPending} size="sm" className="w-full h-8 text-xs">
              <FiPlus className="mr-1 h-3 w-3" /> Add Type
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Settings Panel */}
      <Card className="md:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{selectedType?.name || "Global"} Policy Matrix</CardTitle>
            <CardDescription>Configure salary split, overtime, and allowances for {selectedType?.name}</CardDescription>
          </div>
          <Button onClick={handleSavePolicies} disabled={isPending || !selectedTypeId} className="bg-emerald-600 hover:bg-emerald-700">
            <FiSave className="mr-2 h-4 w-4" /> Save Policies
          </Button>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="salary" className="w-full">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="salary">Salary Split</TabsTrigger>
              <TabsTrigger value="overtime">Overtime</TabsTrigger>
              <TabsTrigger value="tiffin">Tiffin Bill</TabsTrigger>
              <TabsTrigger value="night">Night Bill</TabsTrigger>
            </TabsList>

            {/* Salary Split Tab */}
            <TabsContent value="salary" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Basic Pay Ratio (%)</Label>
                  <Input type="number" value={basicRatio} onChange={(e) => setBasicRatio(Number(e.target.value))} className="mt-1" />
                </div>
                <div>
                  <Label>House Rent Ratio (%)</Label>
                  <Input type="number" value={houseRentRatio} onChange={(e) => setHouseRentRatio(Number(e.target.value))} className="mt-1" />
                </div>
                <div>
                  <Label>Medical Allowance Ratio (%)</Label>
                  <Input type="number" value={medicalRatio} onChange={(e) => setMedicalRatio(Number(e.target.value))} className="mt-1" />
                </div>
                <div>
                  <Label>Transport Allowance Ratio (%)</Label>
                  <Input type="number" value={transportRatio} onChange={(e) => setTransportRatio(Number(e.target.value))} className="mt-1" />
                </div>
                <div>
                  <Label>Food Allowance Ratio (%)</Label>
                  <Input type="number" value={foodRatio} onChange={(e) => setFoodRatio(Number(e.target.value))} className="mt-1" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Total Ratio Sum: {basicRatio + houseRentRatio + medicalRatio + transportRatio + foodRatio}%</p>
            </TabsContent>

            {/* Overtime Policy Tab */}
            <TabsContent value="overtime" className="space-y-4 pt-4">
              <div className="flex items-center justify-between border p-3 rounded-md">
                <div>
                  <Label className="font-semibold">Overtime Eligibility</Label>
                  <p className="text-xs text-muted-foreground">Enable OT calculations for this employee type</p>
                </div>
                <Switch checked={otEligible} onCheckedChange={setOtEligible} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>OT Multiplier (e.g. 1.5x)</Label>
                  <Input type="number" step="0.1" value={otMultiplier} onChange={(e) => setOtMultiplier(Number(e.target.value))} className="mt-1" />
                </div>
                <div>
                  <Label>Min OT Threshold Minutes</Label>
                  <Input type="number" value={otMinMinutes} onChange={(e) => setOtMinMinutes(Number(e.target.value))} className="mt-1" />
                </div>
              </div>
            </TabsContent>

            {/* Tiffin Bill Tab */}
            <TabsContent value="tiffin" className="space-y-4 pt-4">
              <div className="flex items-center justify-between border p-3 rounded-md">
                <div>
                  <Label className="font-semibold">Tiffin Allowance Eligibility</Label>
                  <p className="text-xs text-muted-foreground">Award tiffin bill when employee checks out late</p>
                </div>
                <Switch checked={tiffinEligible} onCheckedChange={setTiffinEligible} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cutoff Checkout Time (HH:MM)</Label>
                  <Input value={tiffinCutoff} onChange={(e) => setTiffinCutoff(e.target.value)} placeholder="20:00" className="mt-1" />
                </div>
                <div>
                  <Label>Daily Tiffin Amount (BDT)</Label>
                  <Input type="number" value={tiffinAmount} onChange={(e) => setTiffinAmount(Number(e.target.value))} className="mt-1" />
                </div>
              </div>
            </TabsContent>

            {/* Night Bill Tab */}
            <TabsContent value="night" className="space-y-4 pt-4">
              <div className="flex items-center justify-between border p-3 rounded-md">
                <div>
                  <Label className="font-semibold">Night Allowance Eligibility</Label>
                  <p className="text-xs text-muted-foreground">Award night bill for overnight or late checkouts</p>
                </div>
                <Switch checked={nightEligible} onCheckedChange={setNightEligible} />
              </div>

              <div>
                <Label>Daily Night Allowance Amount (BDT)</Label>
                <Input type="number" value={nightAmount} onChange={(e) => setNightAmount(Number(e.target.value))} className="mt-1" />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
