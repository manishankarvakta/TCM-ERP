import * as z from "zod";

const grnItemSchema = z.object({
  purchaseItemId: z.string().optional().nullable(),
  tpnItemId: z.string().optional().nullable(),
  receivedQuantity: z.coerce.number().min(0),
}).refine(data => data.purchaseItemId || data.tpnItemId, {
  message: "Either purchaseItemId or tpnItemId must be provided",
  path: ["purchaseItemId"]
});

export const createGRNSchema = z.object({
  purchaseId: z.string().optional().nullable(),
  tpnId: z.string().optional().nullable(),
  warehouseId: z.string(),
  date: z.coerce.date(),
  notes: z.string().optional().nullable(),
  items: z.array(grnItemSchema).min(1, "At least one item is required"),
}).refine(data => data.purchaseId || data.tpnId, {
  message: "Either purchaseId or tpnId must be provided",
  path: ["purchaseId"]
});

export type GRNFormData = z.infer<typeof createGRNSchema>;
