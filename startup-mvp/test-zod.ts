import * as z from "zod";

const biometricDeviceSchema = z.object({
  name: z.string().min(1, "Device name is required"),
  serialNumber: z.string().min(1, "Serial number is required"),
  ipAddress: z.string().optional().or(z.literal("")),
  port: z.coerce.number().optional().or(z.literal(0)),
  location: z.string().optional().or(z.literal("")),
  deviceType: z.string().optional().default("ATTENDANCE"),
  connectionMode: z.string().optional().default("ADMS"),
  isActive: z.boolean().default(true),
  warehouseId: z.string().optional().or(z.literal("")),
});

const defaultValues = {
  name: "Test",
  serialNumber: "SN123",
  ipAddress: "",
  port: 4370,
  location: "",
  deviceType: "ATTENDANCE",
  connectionMode: "ADMS",
  isActive: true,
  warehouseId: "",
};

try {
  const result = biometricDeviceSchema.parse(defaultValues);
  console.log("Success:", result);
} catch (e: any) {
  console.log("Error:", e.errors);
}
