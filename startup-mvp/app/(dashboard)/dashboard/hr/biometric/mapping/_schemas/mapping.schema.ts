import * as z from "zod";

export const employeeDeviceMappingSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  deviceId: z.string().min(1, "Device is required"),
  deviceUserId: z.string().min(1, "Device PIN / User ID is required"),
  isActive: z.boolean().default(true),
});

export type EmployeeDeviceMappingFormData = z.infer<typeof employeeDeviceMappingSchema>;
