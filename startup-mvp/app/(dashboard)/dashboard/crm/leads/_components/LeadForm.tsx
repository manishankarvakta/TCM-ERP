"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FiAlertCircle, FiUpload, FiTrash2 } from "react-icons/fi";
import { createLead, updateLead, getActiveCategories } from "@/app/actions/crm/lead.action";
import { uploadFileServerSide } from "@/app/actions/files";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagInput } from "@/components/ui/tag-input";
import { toast } from "sonner";

const LEAD_SOURCES = [
  "Website",
  "Referral",
  "Cold Call",
  "LinkedIn",
  "Facebook",
  "X",
  "Instagram",
  "Partner",
  "Email Campaign",
  "Event",
  "Advertisement",
  "Whatsapp",
  "Other",
];

const leadSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().min(1, "Phone number is required"),
  alternativePhone: z.string().optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
  source: z.string().optional().or(z.literal("")),
  website: z.string().optional().or(z.literal("")),
  facebook: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  categoryId: z.string().optional().or(z.literal("")),
  reference: z.string().optional().or(z.literal("")),
  photo: z.string().optional().or(z.literal("")),
  startingDate: z.string().optional().or(z.literal("")),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface LeadFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any; // To be typed if needed
}

const parseAlternativePhone = (rawPhone: string | null | undefined) => {
  if (!rawPhone) return { num: "", type: "alternative" };
  if (rawPhone.includes("|")) {
    const parts = rawPhone.split("|");
    return { num: parts[0] || "", type: parts[1] || "alternative" };
  }
  return { num: rawPhone, type: "alternative" };
};

export default function LeadForm({ onSuccess, onCancel, initialData }: LeadFormProps) {
  const parsedAlt = parseAlternativePhone(initialData?.alternativePhone);
  const [altPhoneNum, setAltPhoneNum] = useState(parsedAlt.num);
  const [altPhoneType, setAltPhoneType] = useState(parsedAlt.type);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [customSource, setCustomSource] = useState('');
  const customSourceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchCategories() {
      const res = await getActiveCategories();
      if (res.success) {
        const fetched = res.categories || [];
        // Ensure ERP category exists
        const hasERP = fetched.some((c) => c.name === 'ERP');
        const finalList = hasERP ? fetched : [{ id: 'erp', name: 'ERP' }, ...fetched];
        setCategories(finalList);
      }
    }
    fetchCategories();
  }, []);

  // Initialize form with split name if initialData provided
  const getInitialValues = () => {
    if (!initialData) return {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      alternativePhone: "",
      company: "",
      source: "",
      website: "",
      facebook: "",
      notes: "",
      categoryId: "",
      reference: "",
      photo: "",
      startingDate: new Date().toISOString().split("T")[0],
    };

    const nameParts = (initialData.name || "").split(" ");
    return {
      ...initialData,
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      email: initialData.email || "",
      phone: initialData.phone || "",
      alternativePhone: initialData.alternativePhone || "",
      company: initialData.company || "",
      source: initialData.source || "",
      website: initialData.website || "",
      facebook: initialData.facebook || "",
      notes: initialData.notes || "",
      categoryId: initialData.categoryId || "",
      reference: initialData.reference || "",
      photo: initialData.photo || "",
      startingDate: initialData.startingDate ? new Date(initialData.startingDate).toISOString().split("T")[0] : "",
    };
  };

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: getInitialValues(),
  });

  const photoValue = watch("photo");
  const sourceValue = watch("source");

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setUploading(true);
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileData = buffer.toString("base64");

      const result = await uploadFileServerSide({
        path: "leads/photos",
        name: selectedFile.name,
        fileData,
        contentType: selectedFile.type || "application/octet-stream",
        size: selectedFile.size,
      });

      if (result.success && result.data) {
        setValue("photo", result.data.key);
        toast.success("Photo uploaded successfully");
      } else {
        toast.error(`Upload failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Photo upload error:", error);
      toast.error("An error occurred during photo upload");
    } finally {
      setUploading(false);
      e.target.value = ""; // Reset input
    }
  };

  const onSubmit = async (data: LeadFormData) => {
    try {
      setLoading(true);
      setError("");

      const { firstName, lastName, notes, ...rest } = data;
      const leadName = `${firstName} ${lastName}`.trim();

      // Combine altPhoneNum and altPhoneType into alternativePhone string format: "number|type"
      const finalAltPhone = altPhoneNum.trim()
        ? `${altPhoneNum.trim()}|${altPhoneType}`
        : "";

      const finalSource = sourceValue === 'Other' ? customSource : rest.source;
      const payload = {
        ...rest,
        source: finalSource,
        alternativePhone: finalAltPhone,
        startingDate: rest.startingDate ? new Date(rest.startingDate) : undefined,
      };

      let result;
      if (initialData?.id) {
        // Update existing lead
        result = await updateLead(initialData.id, {
          ...payload,
          name: leadName,
        });
      } else {
        // Create new lead
        result = await createLead({
          ...payload,
          notes,
          name: leadName,
        });
      }

      if (!result.success) {
        throw new Error(result.error || "Failed to save lead");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
          <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input id="firstName" {...register("firstName")} disabled={loading} placeholder="Jane" />
          {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input id="lastName" {...register("lastName")} disabled={loading} placeholder="Doe" />
          {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input id="phone" {...register("phone")} disabled={loading} placeholder="+1 234 567 890" />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="alternativePhone">Alternative Phone</Label>
          <div className="flex gap-2">
            <Input 
              id="alternativePhone" 
              value={altPhoneNum}
              onChange={(e) => setAltPhoneNum(e.target.value)}
              disabled={loading} 
              placeholder="+1 234 567 891" 
              className="flex-1"
            />
            <Select
              value={altPhoneType}
              onValueChange={altPhoneType => setAltPhoneType(altPhoneType)}
              disabled={loading}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="contact">Contact Person</SelectItem>
                <SelectItem value="alternative">Alternative</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {errors.alternativePhone && <p className="text-xs text-destructive">{errors.alternativePhone.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          <Input id="company" {...register("company")} disabled={loading} placeholder="Acme Corp" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input id="website" {...register("website")} disabled={loading} placeholder="https://example.com" />
          {errors.website && <p className="text-xs text-destructive">{errors.website.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} disabled={loading} placeholder="jane.doe@example.com" />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="startingDate">Lead Starting Date</Label>
          <Input id="startingDate" type="date" {...register("startingDate")} disabled={loading} />
          {errors.startingDate && <p className="text-xs text-destructive">{errors.startingDate.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="facebook">Social Links (FB, IG, etc)</Label>
          <Controller
            name="facebook"
            control={control}
            render={({ field }) => (
              <TagInput
                value={field.value || ""}
                onChange={field.onChange}
                disabled={loading}
                placeholder="https://facebook.com/..., press Enter"
              />
            )}
          />
          {errors.facebook && <p className="text-xs text-destructive">{errors.facebook.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Controller
            name="source"
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={(val) => {
                  field.onChange(val);
                  // Scroll to custom input when 'Other' is selected
                  if (val === 'Other' && customSourceRef.current) {
                    customSourceRef.current.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                value={field.value || undefined}
                disabled={loading}
              >
                <SelectTrigger id="source">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((src) => (
                    <SelectItem key={src} value={src}>
                      {src}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {sourceValue === 'Other' && (
            <div ref={customSourceRef} className="space-y-2 mt-2">
              <Label htmlFor="customSource">Custom Source</Label>
              <Input
                id="customSource"
                value={customSource}
                onChange={(e) => setCustomSource(e.target.value)}
                disabled={loading}
                placeholder="Enter custom source"
              />
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="categoryId">Category</Label>
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={field.onChange}
                value={field.value || undefined}
                disabled={loading}
              >
                <SelectTrigger id="categoryId">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reference">Reference</Label>
          <Input id="reference" {...register("reference")} disabled={loading} placeholder="External Lead ID, campaign code, etc." />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Photo</Label>
        <div className="flex items-center gap-4">
          {photoValue ? (
            <div className="relative w-32 h-32 rounded-lg border overflow-hidden group">
              <img
                src={`/api/files/${photoValue}`}
                alt="Lead Photo"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setValue("photo", "")}
                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                title="Remove Photo"
              >
                <FiTrash2 className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-32 h-32 rounded-lg border border-dashed border-muted-foreground/30 hover:border-primary/50 cursor-pointer bg-muted/20 hover:bg-muted/30 transition-colors">
              <FiUpload className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground mt-1">Upload Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploading || loading}
                className="hidden"
              />
            </label>
          )}
          {uploading && <span className="text-sm text-muted-foreground animate-pulse">Uploading...</span>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...register("notes")} disabled={loading} rows={3} placeholder="Additional information..." />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Lead"}
        </Button>
      </div>
    </form>
  );
}
