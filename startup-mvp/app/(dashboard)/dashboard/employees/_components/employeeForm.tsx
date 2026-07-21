"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FiAlertCircle, FiUser, FiMapPin, FiPhone, FiBriefcase, FiDollarSign, FiCalendar, FiCreditCard, FiUpload } from "react-icons/fi";
import { createEmployee, updateEmployee } from "../_actions/employee.action";
import { getWarehouses } from "../../master/warehouses/_actions/warehouse.action";
import { getShifts } from "../../hr/shifts/_actions/shift.action";
import { getEmployeeTypes } from "../types/_actions/employee-type.action";
import { getDepartments } from "../departments/_actions/department.action";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
import { useEffect } from "react";
import MediaSelector from "@/components/MediaSelector";
import { useToast } from "@/hooks/use-toast";
import { SearchableSelect } from "@/components/ui/searchable-select";
import UploadDialog from "@/components/UploadDialog";
import { ChevronLeft, ChevronRight } from "lucide-react";

const employeeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.union([z.string().email("Invalid email address"), z.literal("")]).optional(),
  phone: z.string().min(1, "Phone is required"),
  status: z.enum(["active", "inactive"]),
  designation: z.string().optional().or(z.literal("")),
  department: z.string().optional().or(z.literal("")),
  departmentId: z.string().optional().or(z.literal("")),
  salary: z.coerce.number().optional().or(z.literal(0)),
  joiningDate: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  bloodGroup: z.string().optional().or(z.literal("")),
  type: z.string().optional().or(z.literal("")),
  employeeTypeId: z.string().optional().or(z.literal("")),
  biometricDeviceId: z.string().optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  nationalId: z.string().optional().or(z.literal("")),
  address: z.object({
    country: z.string().optional().or(z.literal("")),
    state: z.string().optional().or(z.literal("")),
    city: z.string().optional().or(z.literal("")),
    street: z.string().optional().or(z.literal("")),
    zipCode: z.string().optional().or(z.literal("")),
  }).optional(),
  emergencyContact: z.object({
    name: z.string().optional().or(z.literal("")),
    relation: z.string().optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
  }).optional(),
  nominee: z.object({
    name: z.string().optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    address: z.string().optional().or(z.literal("")),
    photos: z.array(z.string()).optional(),
  }).optional(),
  warehouseId: z.string().optional().or(z.literal("")),
  photo: z.string().optional().or(z.literal("")),
  shiftId: z.string().optional().or(z.literal("")),

});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

interface EmployeeFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    name: string;
    employeeCode: string | null;
    email: string | null;
    phone: string | null;
    userId: string | null;
    user: {
      id: string;
      name: string | null;
      email: string;
    } | null;
    status: string;
    designation: string | null;
    department: string | null;
    salary: any;
    joiningDate: Date | null;
    gender: string | null;
    bloodGroup: string | null;
    dateOfBirth: Date | null;
    nationalId: string | null;
    address: any;
    emergencyContact: any;
    nominee: any;
    warehouseId: string | null;
    photo: string | null;
    shiftId: string | null;
    type?: string | null;
    employeeTypeId?: string | null;
    departmentId?: string | null;
    departmentRelation?: any;
    salaryPayableAccount: {
      id: string;
      code: string;
      name: string;
      type: string;
    } | null;
    advanceAccount: {
      id: string;
      code: string;
      name: string;
      type: string;
    } | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

export default function EmployeeForm({ mode, initialData }: EmployeeFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema as any),
    defaultValues: initialData
      ? {
          name: initialData.name || "",
          email: initialData.email || "",
          phone: initialData.phone || "",
          status: (initialData.status === "trash" ? "active" : initialData.status) as "active" | "inactive",
          designation: initialData.designation || "",
          department: initialData.department || "",
          departmentId: initialData.departmentId || "",
          salary: initialData.salary ? Number(initialData.salary) : 0,
          joiningDate: initialData.joiningDate ? new Date(initialData.joiningDate).toISOString().split("T")[0] : "",
          gender: initialData.gender || "",
          bloodGroup: (initialData as any).bloodGroup || "",
          dateOfBirth: initialData.dateOfBirth ? new Date(initialData.dateOfBirth).toISOString().split("T")[0] : "",
          nationalId: initialData.nationalId || "",
          address: initialData.address || {
            country: "",
            state: "",
            city: "",
            street: "",
            zipCode: "",
          },
          emergencyContact: initialData.emergencyContact || {
            name: "",
            relation: "",
            phone: "",
          },
          nominee: initialData.nominee || {
            name: "",
            phone: "",
            address: "",
            photos: [],
          },
          warehouseId: initialData.warehouseId || "",
          photo: initialData.photo || "",
          shiftId: initialData.shiftId || "",
          type: initialData.type || "",
          employeeTypeId: initialData.employeeTypeId || "",
          biometricDeviceId: (initialData as any).biometricDeviceId || "",
        }
      : {
          name: "",
          email: "",
          phone: "",
          status: "active",
          designation: "",
          department: "",
          departmentId: "",
          salary: 0,
          joiningDate: "",
          gender: "",
          bloodGroup: "",
          dateOfBirth: "",
          nationalId: "",
          address: {
            country: "",
            state: "",
            city: "",
            street: "",
            zipCode: "",
          },
          emergencyContact: {
            name: "",
            relation: "",
            phone: "",
          },
          nominee: {
            name: "",
            phone: "",
            address: "",
            photos: [],
          },
          warehouseId: "",
          photo: "",
          shiftId: "",
          type: "",
          employeeTypeId: "",
          biometricDeviceId: "",
        },
  });

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [employeeTypes, setEmployeeTypes] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      const warehouseResult = await getWarehouses(1, 100);
      if (warehouseResult.success) {
        setWarehouses(warehouseResult.warehouses);
      }
      
      const shiftResult = await getShifts(1, 100, "", "active");
      if (shiftResult.success) {
        setShifts(shiftResult.shifts);
      }

      const typeResult = await getEmployeeTypes(1, 100, "", "active");
      if (typeResult.success && typeResult.employeeTypes) {
        setEmployeeTypes(typeResult.employeeTypes);
        
        // Auto-match legacy type string to employeeTypeId if not set
        if (initialData && !initialData.employeeTypeId && initialData.type) {
          const matchedType = typeResult.employeeTypes.find(
            (et: any) => et.name.toLowerCase() === initialData.type?.toLowerCase()
          );
          if (matchedType) {
            setValue("employeeTypeId", matchedType.id);
          }
        }
      }

      const deptResult = await getDepartments(1, 100, "", "active");
      if (deptResult.success && deptResult.departments) {
        setDepartments(deptResult.departments);
        
        // Auto-match legacy department string to departmentId if not set
        if (initialData && !initialData.departmentId && initialData.department) {
          const matchedDept = deptResult.departments.find(
            (d: any) => d.name.toLowerCase() === initialData.department?.toLowerCase()
          );
          if (matchedDept) {
            setValue("departmentId", matchedDept.id);
          }
        }
      }
    }
    fetchData();
  }, [initialData]);


  const onSubmit = async (data: EmployeeFormData) => {
    try {
      setLoading(true);
      setError("");

      if (mode === "create") {
        const result = await createEmployee({
          ...data,
          joiningDate: data.joiningDate ? new Date(data.joiningDate) : undefined,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        });

        if (!result.success || !result.employee) {
          throw new Error(result.error || "Failed to create employee");
        }

        toast({
          title: "Success",
          description: "Employee created successfully",
        });

        const basePath = getBasePathFromPathname(pathname);
        router.push(`${basePath}/employees`);
      } else if (mode === "edit" && initialData) {
        const result = await updateEmployee({
          ...data,
          id: initialData.id,
          joiningDate: data.joiningDate ? new Date(data.joiningDate) : undefined,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to update employee");
        }

        toast({
          title: "Success",
          description: "Employee updated successfully",
        });

        const basePath = getBasePathFromPathname(pathname);
        router.push(`${basePath}/employees`);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred. Please try again.";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const nomineePhotos = watch("nominee.photos") || [];
  const [isNomineePhotoDialogOpen, setIsNomineePhotoDialogOpen] = useState(false);

  const handleNomineePhotoSelect = (url: string) => {
    setValue("nominee.photos", [...nomineePhotos, url]);
    setIsNomineePhotoDialogOpen(false);
  };

  const removeNomineePhoto = (index: number) => {
    const updated = nomineePhotos.filter((_, i) => i !== index);
    setValue("nominee.photos", updated);
  };

  const moveNomineePhoto = (index: number, direction: 'left' | 'right') => {
    const updated = [...nomineePhotos];
    if (direction === 'left' && index > 0) {
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      setValue("nominee.photos", updated);
    } else if (direction === 'right' && index < updated.length - 1) {
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      setValue("nominee.photos", updated);
    }
  };

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "create" ? "Add New Employee" : "Edit Employee"}
          </CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Fill in the details to onboard a new employee"
              : "Review and update employee professional and personal information"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-8">
            <div className="space-y-6">
              {/* Form Fields */}
              <div className="space-y-6">
                {error && (
                  <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                    <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Personal Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <FiUser className="text-primary" />
                    <h3 className="font-semibold">Personal Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-8">
                    {/* Left Side - 70% Input Fields */}
                    <div className="space-y-4">
                      {/* Row 1: Name and Phone */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name *</Label>
                          <Input
                            id="name"
                            type="text"
                            placeholder="John Doe"
                            {...register("name")}
                            disabled={loading}
                          />
                          {errors.name && (
                            <p className="text-sm text-destructive">{errors.name.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone *</Label>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="+1 234 567 8900"
                            {...register("phone")}
                            disabled={loading}
                          />
                          {errors.phone && (
                            <p className="text-sm text-destructive">{errors.phone.message}</p>
                          )}
                        </div>
                      </div>

                      {/* Row 2: Email and National ID */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="john@example.com"
                            {...register("email")}
                            disabled={loading}
                          />
                          {errors.email && (
                            <p className="text-sm text-destructive">{errors.email.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="nationalId">National ID / Passport</Label>
                          <div className="relative">
                            <FiCreditCard className="absolute left-3 top-3 text-muted-foreground" />
                            <Input
                              id="nationalId"
                              className="pl-10"
                              placeholder="1234567890"
                              {...register("nationalId")}
                              disabled={loading}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Row 3: Gender, Blood Group and Date of Birth */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="gender">Gender</Label>
                          <Select
                            defaultValue={watch("gender") || ""}
                            onValueChange={(value) => setValue("gender", value)}
                            disabled={loading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[250px]">
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="bloodGroup">Blood Group</Label>
                          <Select
                            defaultValue={watch("bloodGroup") || ""}
                            onValueChange={(value) => setValue("bloodGroup", value)}
                            disabled={loading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select blood group" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[250px]">
                              <SelectItem value="A+">A+</SelectItem>
                              <SelectItem value="A-">A-</SelectItem>
                              <SelectItem value="B+">B+</SelectItem>
                              <SelectItem value="B-">B-</SelectItem>
                              <SelectItem value="AB+">AB+</SelectItem>
                              <SelectItem value="AB-">AB-</SelectItem>
                              <SelectItem value="O+">O+</SelectItem>
                              <SelectItem value="O-">O-</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="dateOfBirth">Date of Birth</Label>
                          <Input
                            id="dateOfBirth"
                            type="date"
                            {...register("dateOfBirth")}
                            disabled={loading}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Side - 30% Image Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="photo">Employee Photo</Label>
                      <div className="rounded-lg border bg-muted/30 p-4 h-full flex flex-col justify-center">
                        <MediaSelector
                          label=""
                          value={watch("photo") || ""}
                          onChange={(url) => setValue("photo", url || "")}
                          allowedTypes={["image/*"]}
                          previewStyle="square"
                        />
                        <p className="text-[10px] text-muted-foreground text-center mt-2 uppercase tracking-tighter">
                          Upload professional portrait
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Job Information */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <FiBriefcase className="text-primary" />
                    <h3 className="font-semibold">Job Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="designation">Designation</Label>
                      <Input
                        id="designation"
                        placeholder="Software Engineer"
                        {...register("designation")}
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="departmentId">Department</Label>
                      <SearchableSelect
                        value={watch("departmentId")}
                        onValueChange={(value) => setValue("departmentId", value || "")}
                        disabled={loading}
                        placeholder="Select department"
                        options={departments.map((d) => ({
                          value: d.id,
                          label: d.name
                        }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="salary">Monthly Salary</Label>
                      <div className="relative">
                        <FiDollarSign className="absolute left-3 top-3 text-muted-foreground" />
                        <Input
                          id="salary"
                          type="number"
                          className="pl-10"
                          placeholder="45000"
                          {...register("salary")}
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="joiningDate">Joining Date</Label>
                      <div className="relative">
                        <FiCalendar className="absolute left-3 top-3 text-muted-foreground" />
                        <Input
                          id="joiningDate"
                          type="date"
                          className="pl-10"
                          {...register("joiningDate")}
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="warehouseId">Assigned Warehouse</Label>
                      <SearchableSelect
                        value={watch("warehouseId")}
                        onValueChange={(value) => setValue("warehouseId", value || "")}
                        disabled={loading}
                        placeholder="Select warehouse"
                        options={warehouses.map((w) => ({
                          value: w.id,
                          label: w.name
                        }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Employment Status</Label>
                      <Select
                        defaultValue={watch("status") || "active"}
                        onValueChange={(value) => setValue("status", value as "active" | "inactive")}
                        disabled={loading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[250px]">
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="shiftId">Assigned Shift</Label>
                      <SearchableSelect
                        value={watch("shiftId")}
                        onValueChange={(value) => setValue("shiftId", value || "")}
                        disabled={loading}
                        placeholder="Select shift"
                        options={shifts.map((s) => ({
                          value: s.id,
                          label: s.name,
                          description: `${s.startTime} - ${s.endTime}`
                        }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="employeeTypeId">Type</Label>
                      <SearchableSelect
                        value={watch("employeeTypeId")}
                        onValueChange={(value) => setValue("employeeTypeId", value || "")}
                        disabled={loading}
                        placeholder="Select type"
                        options={employeeTypes.map((et) => ({
                          value: et.id,
                          label: et.name
                        }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="biometricDeviceId">Biometric Device ID</Label>
                      <Input
                        id="biometricDeviceId"
                        placeholder="Device ID"
                        {...register("biometricDeviceId")}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <FiMapPin className="text-primary" />
                    <h3 className="font-semibold">Address Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="address.street">Street Address</Label>
                      <Input
                        id="address.street"
                        placeholder="Mirpur DOHS"
                        {...register("address.street")}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address.city">City</Label>
                      <Input
                        id="address.city"
                        placeholder="Dhaka"
                        {...register("address.city")}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="address.state">State / Province</Label>
                      <Input
                        id="address.state"
                        placeholder="Dhaka"
                        {...register("address.state")}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address.zipCode">Zip Code</Label>
                      <Input
                        id="address.zipCode"
                        placeholder="1216"
                        {...register("address.zipCode")}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address.country">Country</Label>
                      <Input
                        id="address.country"
                        placeholder="Bangladesh"
                        {...register("address.country")}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <FiPhone className="text-primary" />
                    <h3 className="font-semibold">Emergency Contact</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContact.name">Contact Name</Label>
                      <Input
                        id="emergencyContact.name"
                        placeholder="Abdul Karim"
                        {...register("emergencyContact.name")}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContact.relation">Relation</Label>
                      <Input
                        id="emergencyContact.relation"
                        placeholder="Father"
                        {...register("emergencyContact.relation")}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContact.phone">Contact Phone</Label>
                      <Input
                        id="emergencyContact.phone"
                        placeholder="01811223344"
                        {...register("emergencyContact.phone")}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                {/* Nominee */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <FiUser className="text-primary" />
                    <h3 className="font-semibold">Nominee</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nominee.name">Nominee Name</Label>
                      <Input
                        id="nominee.name"
                        placeholder="John Doe"
                        {...register("nominee.name")}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nominee.phone">Contact Phone</Label>
                      <Input
                        id="nominee.phone"
                        placeholder="01811223344"
                        {...register("nominee.phone")}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nominee.address">Address</Label>
                      <Input
                        id="nominee.address"
                        placeholder="123 Main St"
                        {...register("nominee.address")}
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center">
                      <Label>Nominee Photos</Label>
                      <Button type="button" variant="outline" size="sm" onClick={() => setIsNomineePhotoDialogOpen(true)} disabled={loading}>
                        Add Photo
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2">
                      {nomineePhotos.map((photo: string, index: number) => (
                        <div key={index} className="relative mt-2 group border rounded-lg p-1 bg-muted/20">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={photo} 
                            alt={`Nominee Photo ${index + 1}`} 
                            className="h-24 w-24 object-cover rounded"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeNomineePhoto(index)}
                            disabled={loading}
                          >
                            <span className="text-xs">×</span>
                          </Button>
                          <div className="absolute bottom-1 left-1 right-1 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              type="button" 
                              variant="secondary" 
                              size="icon" 
                              className="h-6 w-6 rounded-full shadow-sm"
                              onClick={() => moveNomineePhoto(index, 'left')}
                              disabled={index === 0 || loading}
                            >
                              <ChevronLeft className="h-3 w-3" />
                            </Button>
                            <Button 
                              type="button" 
                              variant="secondary" 
                              size="icon" 
                              className="h-6 w-6 rounded-full shadow-sm"
                              onClick={() => moveNomineePhoto(index, 'right')}
                              disabled={index === nomineePhotos.length - 1 || loading}
                            >
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {nomineePhotos.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">No photos added yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div className="flex justify-end gap-4 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : mode === "create" ? "Create Employee" : "Update Employee"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <UploadDialog
        isOpen={isNomineePhotoDialogOpen}
        onClose={() => setIsNomineePhotoDialogOpen(false)}
        onSelect={handleNomineePhotoSelect}
        allowedTypes={["image/*"]}
      />
    </div>
  );
}

