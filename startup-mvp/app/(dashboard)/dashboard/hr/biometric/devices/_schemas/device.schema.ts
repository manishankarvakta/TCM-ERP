import * as z from "zod";

export const biometricDeviceSchema = z.object({
  name: z.string().min(1, "Device name is required"),
  serialNumber: z.string().min(1, "Serial number is required"),
  vendor: z.string().min(1, "Device vendor is required").default("ZKTeco"),
  ipAddress: z.string().optional().or(z.literal("")),
  port: z.coerce.number().optional().or(z.literal(0)),
  location: z.string().optional().or(z.literal("")),
  deviceType: z.string().optional().default("ATTENDANCE"),
  connectionMode: z.string().optional().default("ADMS"),
  isActive: z.boolean().default(true),
  warehouseId: z.string().optional().or(z.literal("")),
  username: z.string().optional().or(z.literal("")),
  password: z.string().optional().or(z.literal("")),
});

export type BiometricDeviceFormData = z.infer<typeof biometricDeviceSchema>;
