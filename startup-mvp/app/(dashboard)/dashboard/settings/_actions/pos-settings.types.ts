import { z } from "zod";

export const POS_SETTINGS_KEY = "pos_settings";

export const posSettingsSchema = z.object({
  paperSize: z.enum(["80mm", "58mm"]).default("80mm"),
  logoUrl: z.string().optional().or(z.literal("")),
  showHeaderLogo: z.boolean().default(false),
  headerText: z.string().min(1, "Header text is required").default("Ferrari Fashion"),
  subHeaderText: z.string().default("BIN 004601696-0102 | Mushak 6.3"),
  footerText: z.string().default("Thank you for shopping with us!"),
  showBiller: z.boolean().default(true),
  showTaxDetails: z.boolean().default(true),
  showBarcode: z.boolean().default(false),
  allowNegativeSale: z.boolean().default(false),
  allowDueSale: z.boolean().default(true),
});

export type POSSettings = z.infer<typeof posSettingsSchema>;

export const DEFAULT_POS_SETTINGS: POSSettings = {
  paperSize: "80mm",
  logoUrl: "",
  showHeaderLogo: false,
  headerText: "Ferrari Fashion",
  subHeaderText: "BIN 004601696-0102 | Mushak 6.3",
  footerText: "Thank you for shopping with us!",
  showBiller: true,
  showTaxDetails: true,
  showBarcode: false,
  allowNegativeSale: false,
  allowDueSale: true,
};
